import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

type RunContext = {
  run: Doc<"thread_runs">;
  thread: Doc<"threads">;
  familyName: string | null;
};

export const loadRunContext = internalQuery({
  args: { runId: v.id("thread_runs") },
  handler: async (ctx, args): Promise<RunContext> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("run not found");
    const thread = await ctx.db.get(run.thread_id);
    if (!thread) throw new Error("thread not found");
    const family = await ctx.db.get(run.family_id);
    return { run, thread, familyName: family?.name ?? null };
  },
});

export const writeEvent = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    threadId: v.id("threads"),
    sequence: v.number(),
    type: v.union(
      v.literal("run_started"),
      v.literal("run_paused"),
      v.literal("run_resumed"),
      v.literal("run_finished"),
      v.literal("run_error"),
      v.literal("step_started"),
      v.literal("step_finished"),
      v.literal("message_started"),
      v.literal("message_finished"),
      v.literal("content_started"),
      v.literal("content_delta"),
      v.literal("content_finished"),
      v.literal("tool_call_started"),
      v.literal("tool_call_delta"),
      v.literal("tool_call_finished"),
      v.literal("tool_call_approved"),
      v.literal("tool_call_rejected"),
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("run_events", {
      thread_run_id: args.runId,
      thread_id: args.threadId,
      sequence: args.sequence,
      type: args.type,
      data: args.data,
    });
  },
});

export const appendMessages = internalMutation({
  args: {
    threadId: v.id("threads"),
    runId: v.id("thread_runs"),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("thread not found");
    await ctx.db.patch(args.threadId, { messages: args.messages });
    await ctx.db.patch(args.runId, { history: args.messages });
  },
});

export const patchRunStatus = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    status: v.union(
      v.literal("running"),
      v.literal("waiting_for_approval"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    finishedAt: v.optional(v.number()),
    pendingToolCalls: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const patch: Partial<Doc<"thread_runs">> = { status: args.status };
    if (args.finishedAt !== undefined) patch.finished_at = args.finishedAt;
    if (args.pendingToolCalls !== undefined) {
      patch.state = { pending_tool_calls: args.pendingToolCalls };
    }
    await ctx.db.patch(args.runId, patch);
  },
});

export const insertApprovalRequest = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    toolCallId: v.string(),
    toolName: v.string(),
    arguments: v.any(),
    requestedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tool_call_approvals", {
      thread_run_id: args.runId,
      tool_call_id: args.toolCallId,
      tool_name: args.toolName,
      arguments: args.arguments,
      status: "pending",
      requested_by: args.requestedBy,
    });
  },
});

export const countEvents = internalQuery({
  args: { runId: v.id("thread_runs") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("run_events")
      .withIndex("by_thread_run_and_sequence", (q) => q.eq("thread_run_id", args.runId))
      .collect();
    return events.length;
  },
});

export const loadApprovals = internalQuery({
  args: { runId: v.id("thread_runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_run", (q) => q.eq("thread_run_id", args.runId))
      .collect();
  },
});
