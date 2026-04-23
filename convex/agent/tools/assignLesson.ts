"use node";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args }) => {
    const lessonId = args?.lessonId as Id<"lessons">;
    const memberIds = (args?.memberIds ?? []) as Id<"users">[];
    const dueDate = typeof args?.dueDate === "number" ? (args.dueDate as number) : undefined;

    const result: { assignedCount: number } = await ctx.runMutation(api.lessons.assign, {
      lessonId,
      memberIds,
      dueDate,
    });

    return {
      success: true,
      widget: {
        kind: "lesson-assigned",
        props: {
          lessonId,
          memberIds,
          dueDate: dueDate ?? null,
          assignedCount: result.assignedCount,
        },
      },
    };
  },
});
