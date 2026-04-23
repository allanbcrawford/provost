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

    await ctx.runMutation(internal.agent.tools.attachFile.insertAttachment, {
      runId,
      fileId,
    });

    return { success: true, file_id: fileId };
  },
});

import { internalMutation } from "../../_generated/server";

export const insertAttachment = internalMutation({
  args: { runId: v.id("thread_runs"), fileId: v.id("files") },
  handler: async (ctx, { runId, fileId }) => {
    const existing = await ctx.db
      .query("thread_run_attachments")
      .withIndex("by_run_and_file", (q) => q.eq("thread_run_id", runId).eq("file_id", fileId))
      .unique();
    if (!existing) {
      await ctx.db.insert("thread_run_attachments", {
        thread_run_id: runId,
        file_id: fileId,
      });
    }
  },
});
