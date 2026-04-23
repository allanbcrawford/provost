"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { runId }) => {
    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });

    const observations = await ctx.runQuery(api.observations.listByFamily, {
      familyId: run.family_id,
    });

    return {
      success: true,
      widget: {
        kind: "observations-list",
        props: { observations },
      },
    };
  },
});
