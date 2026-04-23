import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { writeAudit } from "../lib/audit";

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

    const auditable = new Set([
      "run_started",
      "run_finished",
      "run_error",
      "tool_call_started",
      "tool_call_finished",
    ]);
    if (!auditable.has(args.type)) return;

    const run = await ctx.db.get(args.runId);
    if (!run) return;

    const data = (args.data ?? {}) as Record<string, unknown>;
    const toolCallId =
      typeof data.id === "string"
        ? data.id
        : typeof data.toolCallId === "string"
          ? (data.toolCallId as string)
          : undefined;
    const toolName =
      typeof data.name === "string"
        ? data.name
        : typeof data.toolName === "string"
          ? (data.toolName as string)
          : undefined;
    const approvalRequired = data.approvalRequired === true;

    if (args.type === "run_started") {
      await writeAudit(ctx, {
        familyId: run.family_id,
        actorUserId: run.user_id,
        actorKind: "user",
        category: "run",
        action: "agent.run.started",
        resourceType: "thread_runs",
        resourceId: args.runId,
        metadata: { runId: args.runId, threadId: args.threadId, tools: run.tools },
      });
      return;
    }

    if (args.type === "run_finished") {
      const duration_ms =
        run.started_at && run.finished_at
          ? run.finished_at - run.started_at
          : run.started_at
            ? Date.now() - run.started_at
            : null;
      const message_count = Array.isArray(run.history) ? run.history.length : null;
      await writeAudit(ctx, {
        familyId: run.family_id,
        actorUserId: run.user_id,
        actorKind: "agent",
        category: "run",
        action: "agent.run.finished",
        resourceType: "thread_runs",
        resourceId: args.runId,
        metadata: { duration_ms, message_count },
      });
      return;
    }

    if (args.type === "run_error") {
      await writeAudit(ctx, {
        familyId: run.family_id,
        actorUserId: run.user_id,
        actorKind: "agent",
        category: "run",
        action: "agent.run.error",
        resourceType: "thread_runs",
        resourceId: args.runId,
        metadata: { error: data.error ?? data.message ?? null },
      });
      return;
    }

    if (args.type === "tool_call_started") {
      await writeAudit(ctx, {
        familyId: run.family_id,
        actorUserId: run.user_id,
        actorKind: "agent",
        category: "tool_call",
        action: "agent.tool_call.started",
        resourceType: "thread_runs",
        resourceId: args.runId,
        metadata: {
          runId: args.runId,
          toolCallId,
          toolName,
          arguments: data.arguments ?? data.args ?? null,
        },
      });
      if (approvalRequired) {
        await writeAudit(ctx, {
          familyId: run.family_id,
          actorUserId: run.user_id,
          actorKind: "agent",
          category: "approval",
          action: "agent.approval.requested",
          resourceType: "thread_runs",
          resourceId: args.runId,
          metadata: { runId: args.runId, toolCallId, toolName },
        });
      }
      return;
    }

    if (args.type === "tool_call_finished") {
      await writeAudit(ctx, {
        familyId: run.family_id,
        actorUserId: run.user_id,
        actorKind: "agent",
        category: "tool_call",
        action: "agent.tool_call.finished",
        resourceType: "thread_runs",
        resourceId: args.runId,
        metadata: {
          runId: args.runId,
          toolCallId,
          toolName,
          result: data.result ?? null,
          widget: data.widget ?? null,
        },
      });
      return;
    }
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

export const replaceLastUserMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    runId: v.id("thread_runs"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("thread not found");
    const messages = [...(thread.messages ?? [])] as Array<{
      role: string;
      content: unknown;
    }>;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === "user") {
        messages[i] = { role: m.role, content: args.newContent };
        break;
      }
    }
    await ctx.db.patch(args.threadId, { messages });
    const run = await ctx.db.get(args.runId);
    if (run) {
      const history = [...(run.history ?? [])] as Array<{
        role: string;
        content: unknown;
      }>;
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h && h.role === "user") {
          history[i] = { role: h.role, content: args.newContent };
          break;
        }
      }
      await ctx.db.patch(args.runId, { history });
    }
  },
});

export const writeGuardrailAudit = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    action: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;
    await writeAudit(ctx, {
      familyId: run.family_id,
      actorUserId: run.user_id,
      actorKind: "agent",
      category: "auth",
      action: args.action,
      resourceType: "thread_run",
      resourceId: args.runId,
      metadata: args.metadata ?? {},
    });
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
