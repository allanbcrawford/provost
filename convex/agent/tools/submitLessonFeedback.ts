"use node";
// Phase 5.5 (item #9): conversational Submit Lesson Feedback tool.
//
// Closes the loop opened by Issue 3.2: the end-of-article "Feedback" button
// seeds a chat prompt ("I'd like to share feedback on the lesson '<Title>': "),
// the user types their comment in the thread, and the LLM calls this tool to
// persist the feedback into `lesson_feedback` rather than letting it die in
// chat history.
//
// Approval-gated — the user must explicitly confirm before any row is written.

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { log } from "../../lib/log";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (
    ctx,
    { args, toolCallId, runId },
  ): Promise<{
    success: boolean;
    lessonId?: Id<"lessons">;
    kind?: "thumbs_up" | "thumbs_down" | "comment";
    message: string;
  }> => {
    const lessonId = args?.lessonId as Id<"lessons"> | undefined;
    // Accept both the schema-canonical "thumbs_up"/"thumbs_down" AND the
    // shorter "thumb_up"/"thumb_down" the LLM might emit. Normalize to
    // storage form.
    const rawKind = String(args?.kind ?? "").trim();
    const kind: "thumbs_up" | "thumbs_down" | "comment" | null =
      rawKind === "thumbs_up" || rawKind === "thumb_up"
        ? "thumbs_up"
        : rawKind === "thumbs_down" || rawKind === "thumb_down"
          ? "thumbs_down"
          : rawKind === "comment"
            ? "comment"
            : null;
    const comment =
      typeof args?.comment === "string" ? (args.comment as string).trim() : "";

    if (!lessonId) {
      return {
        success: false,
        message: "Missing lessonId — please re-collect from the page selection.",
      };
    }
    if (!kind) {
      return {
        success: false,
        message:
          "Missing or invalid kind — must be one of 'thumbs_up', 'thumbs_down', or 'comment'.",
      };
    }
    if (kind === "comment" && comment.length < 5) {
      return {
        success: false,
        message:
          "Comment is too short — please share at least a sentence (5+ characters) of feedback.",
      };
    }

    const result: {
      lessonId: Id<"lessons">;
      kind: "thumbs_up" | "thumbs_down" | "comment";
      hasComment: boolean;
    } = await ctx.runMutation(
      internal.agent.tools.submitLessonFeedbackInternal.persistFeedback,
      {
        runId,
        lessonId,
        kind,
        comment: kind === "comment" ? comment : "",
        toolCallId,
      },
    );

    log("info", "submit_lesson_feedback.recorded", {
      lessonId: result.lessonId,
      kind: result.kind,
      hasComment: result.hasComment,
      runId,
    });

    return {
      success: true,
      lessonId: result.lessonId,
      kind: result.kind,
      message:
        kind === "comment"
          ? "Thanks — your written feedback is recorded on this lesson."
          : kind === "thumbs_up"
            ? "Thanks — recorded a thumbs up on this lesson."
            : "Thanks — recorded a thumbs down on this lesson.",
    };
  },
});
