"use node";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const resume = internalAction({
  args: {
    runId: v.id("thread_runs"),
    toolCallId: v.string(),
  },
  handler: async (ctx, { runId, toolCallId }) => {
    const { run, thread } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, {
      runId,
    });

    let sequence: number = await ctx.runQuery(internal.agent.runInternal.countEvents, {
      runId,
    });
    const nextSeq = () => ++sequence;

    await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
      runId,
      status: "running",
      pendingToolCalls: [],
    });

    await ctx.runMutation(internal.agent.runInternal.writeEvent, {
      runId,
      threadId: thread._id,
      sequence: nextSeq(),
      type: "run_resumed",
      data: { reason: "form_submitted", toolCallId },
    });

    await ctx.runAction(internal.agent.runActions.execute, {
      runId,
      route: "any",
      selection: null,
    });
  },
});
