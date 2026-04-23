import { v } from "convex/values";
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
