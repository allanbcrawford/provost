"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { runId }): Promise<Record<string, unknown>> => {
    const { run } = (await ctx.runQuery(internal.agent.runInternal.loadRunContext, {
      runId,
    })) as { run: { family_id: Id<"families"> } };

    const observations = (await ctx.runQuery(api.observations.listByFamily, {
      familyId: run.family_id,
    })) as Doc<"observations">[];

    return {
      success: true,
      widget: {
        kind: "observations-list",
        props: { observations },
      },
    };
  },
});
