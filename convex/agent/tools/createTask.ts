"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }) => {
    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });

    const assigneeType = args?.assigneeType as "planner" | "professional" | "member";
    const title = String(args?.title ?? "");
    const body = String(args?.body ?? "");
    const assigneeId = args?.assigneeId ? String(args.assigneeId) : undefined;
    const sourceSignalId = args?.sourceSignalId
      ? (args.sourceSignalId as Id<"signals">)
      : undefined;

    const taskId: Id<"tasks"> = await ctx.runMutation(api.tasks.create, {
      familyId: run.family_id,
      assigneeType,
      title,
      body,
      assigneeId,
      sourceSignalId,
    });

    await ctx.scheduler.runAfter(0, internal.agent.tools.createTask.notify, { taskId });

    return {
      success: true,
      widget: {
        kind: "task",
        props: {
          taskId,
          title,
          assigneeType,
          status: "open",
        },
      },
    };
  },
});

// TODO(phase-6): send real email via external provider (Resend/SES).
export const notify = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (_ctx, { taskId }) => {
    console.log(`[createTask.notify] TODO phase-6: send email for task ${taskId}`);
  },
});
