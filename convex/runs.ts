import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

export const getEvents = query({
  args: { threadRunId: v.id("thread_runs") },
  handler: async (ctx, { threadRunId }) => {
    const run = await ctx.db.get(threadRunId);
    if (!run) return [];
    await requireFamilyMember(ctx, run.family_id);
    const rows = await ctx.db
      .query("run_events")
      .withIndex("by_thread_run_and_sequence", (q) => q.eq("thread_run_id", threadRunId))
      .collect();
    return rows.map((r) => ({
      type: r.type,
      sequence: r.sequence,
      data: r.data,
      timestamp: r._creationTime,
    }));
  },
});
