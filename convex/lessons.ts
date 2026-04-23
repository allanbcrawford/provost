import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

import { mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";

export const list = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();

    const assignments = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const assignmentByLesson = new Map<Id<"lessons">, Doc<"lesson_users">>();
    for (const a of assignments) assignmentByLesson.set(a.lesson_id, a);

    return lessons
      .filter((l) => !l.deleted_at)
      .map((l) => {
        const a = assignmentByLesson.get(l._id);
        return {
          _id: l._id,
          title: l.title,
          description: l.description ?? "",
          category: l.category,
          status: a?.status ?? null,
          slide_index: a?.slide_index ?? 0,
          due_date: a?.due_date ?? null,
        };
      });
  },
});

export const get = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, lesson.family_id);
    const user = await requireUserRecord(ctx);
    const assignment = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .filter((q) => q.eq(q.field("lesson_id"), lessonId))
      .unique();
    return {
      _id: lesson._id,
      family_id: lesson.family_id,
      title: lesson.title,
      description: lesson.description ?? "",
      category: lesson.category,
      content: lesson.content,
      assignment: assignment
        ? {
            _id: assignment._id,
            status: assignment.status,
            slide_index: assignment.slide_index,
            due_date: assignment.due_date ?? null,
          }
        : null,
    };
  },
});

export const listMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const assignments = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const results = await Promise.all(
      assignments.map(async (a) => {
        const lesson = await ctx.db.get(a.lesson_id);
        if (!lesson || lesson.deleted_at) return null;
        return {
          _id: a._id,
          lesson_id: a.lesson_id,
          status: a.status,
          slide_index: a.slide_index,
          due_date: a.due_date ?? null,
          title: lesson.title,
          description: lesson.description ?? "",
          category: lesson.category,
        };
      }),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const assign = mutation({
  args: {
    lessonId: v.id("lessons"),
    memberIds: v.array(v.id("users")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, { lessonId, memberIds, dueDate }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id, ["admin"]);

    const created: Id<"lesson_users">[] = [];
    for (const memberId of memberIds) {
      const existing = await ctx.db
        .query("lesson_users")
        .withIndex("by_user", (q) => q.eq("user_id", memberId))
        .filter((q) => q.eq(q.field("lesson_id"), lessonId))
        .unique();
      if (existing) {
        if (dueDate !== undefined) await ctx.db.patch(existing._id, { due_date: dueDate });
        created.push(existing._id);
        continue;
      }
      const id = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: memberId,
        due_date: dueDate,
        status: "assigned",
        slide_index: 0,
      });
      created.push(id);
    }
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "lessons.assign",
      resourceType: "lessons",
      resourceId: lessonId,
      metadata: { memberCount: memberIds.length, dueDate: dueDate ?? null },
    });
    return { assignedCount: created.length };
  },
});

export const start = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const existing = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .filter((q) => q.eq(q.field("lesson_id"), lessonId))
      .unique();
    let assignmentId: Id<"lesson_users">;
    if (existing) {
      if (existing.status !== "completed") {
        await ctx.db.patch(existing._id, { status: "in_progress" });
      }
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "in_progress",
        slide_index: 0,
      });
    }
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "lessons.start",
      resourceType: "lessons",
      resourceId: lessonId,
    });
    return assignmentId;
  },
});

export const complete = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const existing = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .filter((q) => q.eq(q.field("lesson_id"), lessonId))
      .unique();
    let assignmentId: Id<"lesson_users">;
    if (existing) {
      await ctx.db.patch(existing._id, { status: "completed" });
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "completed",
        slide_index: 0,
      });
    }
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "lessons.complete",
      resourceType: "lessons",
      resourceId: lessonId,
    });
    return assignmentId;
  },
});

export const setSlideIndex = mutation({
  args: { lessonId: v.id("lessons"), slideIndex: v.number() },
  handler: async (ctx, { lessonId, slideIndex }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const existing = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .filter((q) => q.eq(q.field("lesson_id"), lessonId))
      .unique();
    let assignmentId: Id<"lesson_users">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        slide_index: slideIndex,
        status: existing.status === "completed" ? existing.status : "in_progress",
      });
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "in_progress",
        slide_index: slideIndex,
      });
    }
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "lessons.set_slide_index",
      resourceType: "lessons",
      resourceId: lessonId,
      metadata: { slideIndex },
    });
    return assignmentId;
  },
});
