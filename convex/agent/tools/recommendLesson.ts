"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

// Recommends a lesson without changing the user's delivery state. The 2-active
// rule is rule-based and lives in `lessonDelivery`; this tool surfaces a
// "you might also enjoy" card that the user can choose to bookmark or open.
// Use this where the legacy `assign_lesson` would have been used by the LLM.
export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }): Promise<Record<string, unknown>> => {
    const lessonId = args?.lessonId as Id<"lessons"> | undefined;
    const reason = typeof args?.reason === "string" ? (args.reason as string) : undefined;
    if (!lessonId) {
      return { success: false, error: "lessonId required", widget: null };
    }

    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });
    const familyId = run.family_id as Id<"families">;
    const userId = run.user_id as Id<"users">;

    const lesson = (await ctx.runQuery(internal.agent.knowledgeHydrate.getLesson, {
      lessonId,
      familyId,
      userId,
    })) as { _id: Id<"lessons">; title: string; description?: string | null } | null;
    if (!lesson) {
      return { success: false, error: "lesson not found", widget: null };
    }

    return {
      success: true,
      widget: {
        kind: "lesson-recommendation",
        props: {
          lessonId,
          title: lesson.title,
          description: lesson.description ?? "",
          reason: reason ?? null,
        },
      },
    };
  },
});
