import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const loadThread = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const t = await ctx.db.get(threadId);
    if (!t || t.deleted_at) return null;
    return {
      _id: t._id,
      messages: t.messages,
      summary: t.summary,
      summarized_up_to_index: t.summarized_up_to_index,
    };
  },
});

export const writeSummary = internalMutation({
  args: {
    threadId: v.id("threads"),
    summary: v.string(),
    upToIndex: v.number(),
  },
  handler: async (ctx, { threadId, summary, upToIndex }) => {
    await ctx.db.patch(threadId, {
      summary,
      summarized_up_to_index: upToIndex,
      summarized_at: Date.now(),
    });
  },
});

export const listSummarizable = internalQuery({
  args: {
    since: v.number(),
    minMessages: v.number(),
  },
  handler: async (ctx, { since, minMessages }) => {
    const rows = await ctx.db.query("threads").collect();
    return rows
      .filter((t) => {
        if (t.deleted_at) return false;
        if ((t.messages?.length ?? 0) < minMessages) return false;
        // Use _creationTime as a fallback; threads updated via patch don't get
        // a native updated_at. This is safe: we re-check cutoff inside the
        // summarizer and skip no-ops.
        return t._creationTime >= since || (t.summarized_at ?? 0) < since;
      })
      .map((t) => t._id as string);
  },
});
