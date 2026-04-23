"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { runId }) => {
    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });
    const result: { inserted: number; updated: number; total: number; seen: number } =
      await ctx.runMutation(api.signals.generateFromRules, { familyId: run.family_id });
    const count = result.inserted + result.updated;
    return {
      success: true,
      widget: { kind: "signals-refreshed", props: { count } },
    };
  },
});
