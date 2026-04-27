// Widen-phase backfill for signals.review_status. Existing rows had no
// review_status; we default them to "approved" so they stay visible to
// family members. Only new LLM-sourced signals going forward default to
// "pending_review" (set by the agent insertion path).
//
//   npx convex run signalReviewBackfill:backfillAll

import { internalMutation } from "./_generated/server";

export const backfillAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const signals = await ctx.db.query("signals").collect();
    let patched = 0;
    for (const s of signals) {
      if (s.review_status !== undefined) continue;
      await ctx.db.patch(s._id, { review_status: "approved" });
      patched++;
    }
    return { total: signals.length, patched };
  },
});
