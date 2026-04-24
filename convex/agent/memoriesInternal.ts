import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const insertMemory = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    text: v.string(),
  },
  handler: async (ctx, { runId, text }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error("run not found");
    const memoryId = await ctx.db.insert("family_memories", {
      family_id: run.family_id,
      text,
      source_run_id: runId,
      created_by_user_id: run.user_id,
    });
    return { memoryId };
  },
});

export const listRecent = internalQuery({
  args: {
    familyId: v.id("families"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { familyId, limit }) => {
    const rows = await ctx.db
      .query("family_memories")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    rows.sort((a, b) => b._creationTime - a._creationTime);
    return rows.slice(0, limit ?? 10).map((r) => ({ text: r.text, createdAt: r._creationTime }));
  },
});
