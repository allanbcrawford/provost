import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const rows = await ctx.db
      .query("lesson_bookmarks")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    rows.sort((a, b) => b.created_at - a.created_at);

    const results = await Promise.all(
      rows.map(async (b) => {
        const lesson = await ctx.db.get(b.lesson_id);
        if (!lesson || lesson.deleted_at) return null;
        return {
          _id: b._id,
          lesson_id: b.lesson_id,
          title: lesson.title,
          description: lesson.description ?? "",
          category: lesson.category,
          created_at: b.created_at,
        };
      }),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

// Toggle: if a bookmark exists for (user, lesson), remove it; otherwise add.
export const toggle = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    const existing = await ctx.db
      .query("lesson_bookmarks")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", user._id).eq("lesson_id", lessonId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("lesson_bookmarks", {
      user_id: user._id,
      lesson_id: lessonId,
      family_id: lesson.family_id,
      created_at: Date.now(),
    });
    return { bookmarked: true };
  },
});
