// Shared upsert for `lesson_feedback`. Used by both:
//   • `lessons.submitFeedback` (public mutation, in-page UI path)
//   • `agent/tools/submitLessonFeedbackInternal.persistFeedback` (internal
//     mutation, conversational tool path)
//
// Both writers need identical row-shape behavior — one row per
// (user, lesson, kind), with thumbs flipping clearing the opposite thumb,
// and comments overwriting the existing body. Extracted here so the storage
// invariants live in one place; auth, rate-limit, and audit emission stay
// at the call site (each path has different auth boundaries and emits a
// distinct audit action).
//
// `internalMutation` cannot call public mutations via `ctx.runMutation`,
// which is why we share via a helper rather than collapsing the writers.
//
// Returns `{ hasComment }` so callers can include it in their audit metadata
// without re-deriving from inputs.

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type LessonFeedbackKind = "thumbs_up" | "thumbs_down" | "comment";

export async function upsertLessonFeedback(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    lessonId: Id<"lessons">;
    familyId: Id<"families">;
    kind: LessonFeedbackKind;
    comment?: string;
  },
): Promise<{ hasComment: boolean }> {
  const { userId, lessonId, familyId, kind } = args;

  const existing = await ctx.db
    .query("lesson_feedback")
    .withIndex("by_lesson", (q) => q.eq("lesson_id", lessonId))
    .collect();
  const mine = existing.filter((row) => row.user_id === userId);

  if (kind === "thumbs_up" || kind === "thumbs_down") {
    const opposite = kind === "thumbs_up" ? "thumbs_down" : "thumbs_up";
    for (const row of mine) {
      if (row.kind === opposite) await ctx.db.delete(row._id);
    }
    const sameKind = mine.find((row) => row.kind === kind);
    if (sameKind) {
      await ctx.db.patch(sameKind._id, { created_at: Date.now() });
    } else {
      await ctx.db.insert("lesson_feedback", {
        user_id: userId,
        lesson_id: lessonId,
        family_id: familyId,
        kind,
        created_at: Date.now(),
      });
    }
    return { hasComment: false };
  }

  const trimmed =
    args.comment && args.comment.trim().length > 0 ? args.comment.trim() : undefined;
  const sameKind = mine.find((row) => row.kind === "comment");
  if (sameKind) {
    await ctx.db.patch(sameKind._id, {
      body: trimmed,
      created_at: Date.now(),
    });
  } else {
    await ctx.db.insert("lesson_feedback", {
      user_id: userId,
      lesson_id: lessonId,
      family_id: familyId,
      kind: "comment",
      body: trimmed,
      created_at: Date.now(),
    });
  }
  return { hasComment: trimmed !== undefined };
}
