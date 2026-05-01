// Internal mutation backing the submit_lesson_feedback tool action.
//
// The row-shape upsert lives in `convex/lib/lessonFeedback.ts` and is shared
// with `lessons.submitFeedback` so both writers stay consistent. This file
// keeps the tool-specific concerns: auth (`requireFamilyMember` against the
// run's family), rate limiting, and a distinct audit action
// (`lesson.feedback.submitted_via_tool`) so we can tell tool-driven feedback
// apart from the in-page UI path in the audit log.
//
// Authorization is derived server-side from the auth identity. The `runId`
// arg pins the work to the originating chat run (so audit can correlate)
// but is NOT used for authz.

import { ConvexError, v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { writeAudit } from "../../lib/audit";
import { requireFamilyMember } from "../../lib/authz";
import { upsertLessonFeedback } from "../../lib/lessonFeedback";
import { checkAndIncrement } from "../../lib/rateLimit";

const kindValidator = v.union(
  v.literal("thumbs_up"),
  v.literal("thumbs_down"),
  v.literal("comment"),
);

export const persistFeedback = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    lessonId: v.id("lessons"),
    kind: kindValidator,
    comment: v.string(),
    toolCallId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    lessonId: Id<"lessons">;
    kind: "thumbs_up" | "thumbs_down" | "comment";
    hasComment: boolean;
  }> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });

    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || lesson.deleted_at) {
      throw new ConvexError({ code: "LESSON_NOT_FOUND" });
    }
    if (lesson.family_id !== run.family_id) {
      throw new ConvexError({ code: "LESSON_FAMILY_MISMATCH" });
    }

    // Auth + role gate. Feedback is open to any family role: admin, advisor,
    // member, trustee. requireFamilyMember (no roles arg) accepts any.
    const { user } = await requireFamilyMember(ctx, lesson.family_id);

    await checkAndIncrement(ctx, "tool.submit_lesson_feedback:user", user._id);

    const { hasComment } = await upsertLessonFeedback(ctx, {
      userId: user._id,
      lessonId: args.lessonId,
      familyId: lesson.family_id,
      kind: args.kind,
      comment: args.comment,
    });

    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "tool_call",
      action: "lesson.feedback.submitted_via_tool",
      resourceType: "lessons",
      resourceId: args.lessonId,
      metadata: {
        toolCallId: args.toolCallId,
        runId: args.runId,
        lessonId: args.lessonId,
        kind: args.kind,
        hasComment,
      },
    });

    return { lessonId: args.lessonId, kind: args.kind, hasComment };
  },
});
