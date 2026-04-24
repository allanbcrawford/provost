"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }): Promise<{ success: boolean; memoryId?: string }> => {
    const text = String(args?.text ?? "").trim();
    if (!text) return { success: false };

    const { memoryId } = await ctx.runMutation(internal.agent.memoriesInternal.insertMemory, {
      runId,
      text,
    });

    return { success: true, memoryId };
  },
});
