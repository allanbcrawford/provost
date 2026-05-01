// Lesson APIs span two eras during P0b's migration window:
//
//   • New (recommended): `myActiveLessons`, `getWithContext`, `recordSlideIndex`
//     — speak the Programs → Tracks → Lessons hierarchy with locked/active/
//     complete/advanced status. Quiz pass advances delivery.
//   • Legacy: `list`, `get`, `listMyAssignments`, `assign`, `start`, `complete`,
//     `setSlideIndex` — kept for the existing UI to keep working until the
//     frontend is rewritten. New writes via these legacy paths still work but
//     do not participate in the 2-active rule.
//
// Per-record ACL is intentionally NOT wired here. Lesson visibility is
// governed by `lesson_users` rows (assignment-style scoping), which already
// give us per-user filtering. Family membership is the outer gate.
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

import { mutation, query } from "./_generated/server";
import { advanceLearner } from "./lessonDelivery";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember, requireSiteAdmin, requireUserRecord } from "./lib/authz";
import { touchLessonUser } from "./lib/lessonUsers";

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
      // Phase 5.5.4 — user-driven touch
      await touchLessonUser(ctx, existing._id);
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "in_progress",
        slide_index: 0,
        last_touched_at: Date.now(),
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
      // Phase 5.5.4 — user-driven touch
      await touchLessonUser(ctx, existing._id);
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "completed",
        slide_index: 0,
        last_touched_at: Date.now(),
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
      // Phase 5.5.4 — user-driven touch
      await touchLessonUser(ctx, existing._id);
      assignmentId = existing._id;
    } else {
      assignmentId = await ctx.db.insert("lesson_users", {
        lesson_id: lessonId,
        user_id: user._id,
        status: "in_progress",
        slide_index: slideIndex,
        last_touched_at: Date.now(),
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

// =============================================================================
// New (P0b) — Programs/Tracks-aware APIs.
// =============================================================================

type LessonContextRow = {
  lesson: Doc<"lessons">;
  track: Doc<"tracks"> | null;
  program: Doc<"programs"> | null;
  status: string | null;
  slide_index: number;
};

// "My active lessons" — what the user should see on the Education home tab.
// Returns up to 2 active lessons, ordered by track sort_order then lesson
// sort_order. Eagerly calls advanceLearner so a freshly onboarded user sees
// their starter lessons without an explicit step.
//
// Note: this is a query, so it cannot mutate. Initial activation happens via
// `ensureInitialActive` mutation called from the Education page on first load
// or onboarding completion. This query reads whatever delivery state exists.
export const myActiveLessons = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("lesson_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const active = rows.filter(
      (r) => r.status === "active" || r.status === "in_progress" || r.status === "assigned",
    );

    const out: LessonContextRow[] = [];
    for (const r of active) {
      const lesson = await ctx.db.get(r.lesson_id);
      if (!lesson || lesson.deleted_at) continue;
      if (lesson.family_id !== familyId) continue;
      const track = lesson.track_id ? await ctx.db.get(lesson.track_id) : null;
      const program = track?.program_id ? await ctx.db.get(track.program_id) : null;
      out.push({
        lesson,
        track: track && !track.deleted_at ? track : null,
        program: program && !program.deleted_at ? program : null,
        status: r.status,
        slide_index: r.slide_index,
      });
    }
    out.sort((a, b) => {
      const ta = a.track?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const tb = b.track?.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return (a.lesson.sort_order ?? 0) - (b.lesson.sort_order ?? 0);
    });
    return out.map((row) => ({
      _id: row.lesson._id,
      title: row.lesson.title,
      description: row.lesson.description ?? "",
      category: row.lesson.category,
      track: row.track ? { _id: row.track._id, title: row.track.title } : null,
      program: row.program
        ? {
            _id: row.program._id,
            title: row.program.title,
            stewardship_phase: row.program.stewardship_phase,
          }
        : null,
      status: row.status,
      slide_index: row.slide_index,
    }));
  },
});

// Lesson detail with track + program context for the reader page.
export const getWithContext = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const track = lesson.track_id ? await ctx.db.get(lesson.track_id) : null;
    const program = track?.program_id ? await ctx.db.get(track.program_id) : null;

    const assignment = await ctx.db
      .query("lesson_users")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", user._id).eq("lesson_id", lessonId))
      .unique();

    const bookmark = await ctx.db
      .query("lesson_bookmarks")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", user._id).eq("lesson_id", lessonId))
      .unique();

    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_lesson", (q) => q.eq("lesson_id", lessonId))
      .unique();

    // Pull a couple of related lessons for the "You might also enjoy" rail —
    // siblings in the same track, then fall back to other lessons in the
    // same program, ordered by sort_order.
    const recommendations: Array<{ _id: typeof lesson._id; title: string }> = [];
    if (lesson.track_id) {
      const trackSiblings = await ctx.db
        .query("lessons")
        .withIndex("by_track", (q) => q.eq("track_id", lesson.track_id))
        .collect();
      for (const l of trackSiblings) {
        if (l._id === lesson._id) continue;
        if (l.deleted_at) continue;
        recommendations.push({ _id: l._id, title: l.title });
        if (recommendations.length >= 3) break;
      }
    }

    return {
      lesson: {
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description ?? "",
        category: lesson.category,
        content: lesson.content,
        format: (lesson.format ?? "slides") as "article" | "slides",
        article_markdown: lesson.article_markdown ?? null,
      },
      track: track && !track.deleted_at ? { _id: track._id, title: track.title } : null,
      program:
        program && !program.deleted_at
          ? {
              _id: program._id,
              title: program.title,
              stewardship_phase: program.stewardship_phase,
            }
          : null,
      assignment: assignment
        ? {
            _id: assignment._id,
            status: assignment.status,
            slide_index: assignment.slide_index,
            quiz_passed_at: assignment.quiz_passed_at ?? null,
          }
        : null,
      bookmarked: bookmark !== null,
      hasQuiz: quiz !== null,
      recommendations,
    };
  },
});

// Admin/advisor-only: replace a lesson's article markdown. Sets format
// to "article" so the reader switches modes. Use this from the curation
// flow once the article migration runs (`learningBackfill:migrateArticles`).
export const updateArticle = mutation({
  args: {
    lessonId: v.id("lessons"),
    articleMarkdown: v.string(),
  },
  handler: async (ctx, { lessonId, articleMarkdown }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    // Family admin/advisor OR Provost site admin (cross-tenant curation).
    let actorUserId: Id<"users">;
    try {
      const { user } = await requireFamilyMember(ctx, lesson.family_id, ["admin", "advisor"]);
      actorUserId = user._id;
    } catch (_err) {
      const admin = await requireSiteAdmin(ctx);
      actorUserId = admin._id;
    }
    await ctx.db.patch(lessonId, {
      article_markdown: articleMarkdown,
      format: "article",
    });
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId,
      actorKind: "user",
      category: "mutation",
      action: "lessons.update_article",
      resourceType: "lessons",
      resourceId: lessonId,
      metadata: { length: articleMarkdown.length },
    });
    return null;
  },
});

// Site-admin-only: update lesson metadata (title, description, format) for
// the in-browser curation editor. Bypasses family-membership checks because
// site admins curate content across families. Audit is written under the
// lesson's owning family so the trail stays scoped to the affected tenant.
export const updateMetadata = mutation({
  args: {
    lessonId: v.id("lessons"),
    title: v.string(),
    description: v.string(),
    format: v.union(v.literal("article"), v.literal("slides")),
  },
  handler: async (ctx, { lessonId, title, description, format }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const admin = await requireSiteAdmin(ctx);
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      throw new ConvexError({ code: "INVALID_TITLE" });
    }
    await ctx.db.patch(lessonId, {
      title: trimmedTitle,
      description: description.trim().length > 0 ? description.trim() : undefined,
      format,
    });
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: admin._id,
      actorKind: "user",
      category: "mutation",
      action: "lessons.update_metadata",
      resourceType: "lessons",
      resourceId: lessonId,
      metadata: { titleLength: trimmedTitle.length, format },
    });
    return null;
  },
});

// Site-admin loader for the curation editor. Returns the full lesson row
// plus track + program context. Bypasses family-membership gating so the
// internal Provost team can curate any tenant's content.
export const getForAdminEdit = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    await requireSiteAdmin(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const track = lesson.track_id ? await ctx.db.get(lesson.track_id) : null;
    const program = track?.program_id ? await ctx.db.get(track.program_id) : null;
    return {
      lesson: {
        _id: lesson._id,
        family_id: lesson.family_id,
        title: lesson.title,
        description: lesson.description ?? "",
        category: lesson.category,
        format: (lesson.format ?? "slides") as "article" | "slides",
        article_markdown: lesson.article_markdown ?? null,
      },
      track: track && !track.deleted_at ? { _id: track._id, title: track.title } : null,
      program:
        program && !program.deleted_at
          ? {
              _id: program._id,
              title: program.title,
              stewardship_phase: program.stewardship_phase,
            }
          : null,
    };
  },
});

// Lightweight feedback capture (thumbs / comments). Family-scoped. Multiple
// rows per (user, lesson) are fine — feedback is append-only history.
export const submitFeedback = mutation({
  args: {
    lessonId: v.id("lessons"),
    kind: v.union(v.literal("thumbs_up"), v.literal("thumbs_down"), v.literal("comment")),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { lessonId, kind, body }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);
    await ctx.db.insert("lesson_feedback", {
      user_id: user._id,
      lesson_id: lessonId,
      family_id: lesson.family_id,
      kind,
      body: body && body.trim().length > 0 ? body.trim() : undefined,
      created_at: Date.now(),
    });
    return null;
  },
});

// Mutation called from the Education page or onboarding to populate the
// initial 2 active lessons for the signed-in user. Idempotent.
export const ensureInitialActive = mutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const result = await advanceLearner(ctx, { userId: user._id, familyId });
    return result;
  },
});

// Persist reading progress (slide index / scroll position). Caller must be
// the lesson's family member; behavior matches legacy setSlideIndex but
// uses new vocabulary (no "in_progress" — active lessons stay active until
// quiz pass).
export const recordSlideIndex = mutation({
  args: { lessonId: v.id("lessons"), slideIndex: v.number() },
  handler: async (ctx, { lessonId, slideIndex }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const existing = await ctx.db
      .query("lesson_users")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", user._id).eq("lesson_id", lessonId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { slide_index: slideIndex });
      // Phase 5.5.4 — user-driven touch
      await touchLessonUser(ctx, existing._id);
      return existing._id;
    }
    return await ctx.db.insert("lesson_users", {
      lesson_id: lessonId,
      user_id: user._id,
      family_id: lesson.family_id,
      status: "active",
      slide_index: slideIndex,
      last_touched_at: Date.now(),
    });
  },
});

// Programs view (admin/advisor only): tree of phase → programs → tracks → lessons.
export const programsTree = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const livePrograms = programs.filter((p) => !p.deleted_at);

    const tree = [];
    for (const program of livePrograms) {
      const tracks = await ctx.db
        .query("tracks")
        .withIndex("by_program", (q) => q.eq("program_id", program._id))
        .collect();
      const liveTracks = tracks.filter((t) => !t.deleted_at);
      const trackEntries = [];
      for (const track of liveTracks) {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_track", (q) => q.eq("track_id", track._id))
          .collect();
        const liveLessons = lessons
          .filter((l) => !l.deleted_at)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        trackEntries.push({
          _id: track._id,
          title: track.title,
          sort_order: track.sort_order,
          lessons: liveLessons.map((l) => ({
            _id: l._id,
            title: l.title,
            sort_order: l.sort_order ?? 0,
          })),
        });
      }
      trackEntries.sort((a, b) => a.sort_order - b.sort_order);
      tree.push({
        _id: program._id,
        title: program.title,
        stewardship_phase: program.stewardship_phase,
        sort_order: program.sort_order,
        tracks: trackEntries,
      });
    }
    tree.sort((a, b) => a.sort_order - b.sort_order);
    return tree;
  },
});

// Progress view (admin/advisor only): per-member completion rollup.
export const familyProgress = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const familyLessons = await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const totalLessons = familyLessons.filter((l) => !l.deleted_at).length;

    const out = [];
    for (const m of memberships) {
      const u = await ctx.db.get(m.user_id);
      if (!u) continue;
      const rows = await ctx.db
        .query("lesson_users")
        .withIndex("by_user", (q) => q.eq("user_id", m.user_id))
        .collect();
      const familyRows = rows.filter(
        (r) => r.family_id === familyId || familyLessons.some((l) => l._id === r.lesson_id),
      );
      const complete = familyRows.filter(
        (r) => r.status === "complete" || r.status === "completed" || r.status === "advanced",
      ).length;
      const active = familyRows.filter(
        (r) => r.status === "active" || r.status === "in_progress" || r.status === "assigned",
      ).length;
      out.push({
        user_id: m.user_id,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
        role: m.role,
        stewardship_phase: u.stewardship_phase ?? null,
        completed: complete,
        active,
        total: totalLessons,
      });
    }
    return out;
  },
});
