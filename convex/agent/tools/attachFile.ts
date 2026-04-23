"use node";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }) => {
    const fileId = args?.file_id;
    if (!fileId) {
      return { success: false, error: "file_id is required" };
    }

    await ctx.runMutation(internal.agent.tools.attachFileInternal.insertAttachment, {
      runId,
      fileId,
    });

    return { success: true, file_id: fileId };
  },
});
