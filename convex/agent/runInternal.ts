import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { touchThread } from "../lib/threads";

type RosterEntry = {
  name: string;
  role: string;
  generation: number;
};

type RunContext = {
  run: Doc<"thread_runs">;
  thread: Doc<"threads">;
  familyName: string | null;
  members: RosterEntry[];
  memories: Array<{ text: string; createdAt: number }>;
  // Layered-prompt inputs: who's asking, in what role, at what phase.
  caller: {
    firstName?: string;
    lastName?: string;
    generation?: number;
    stewardshipPhase?: string;
    familyRole?: "admin" | "member" | "advisor" | "trustee" | null;
  } | null;
};

export const loadRunContext = internalQuery({
  args: { runId: v.id("thread_runs") },
  handler: async (ctx, args): Promise<RunContext> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("run not found");
    const thread = await ctx.db.get(run.thread_id);
    if (!thread) throw new Error("thread not found");
    const family = await ctx.db.get(run.family_id);

    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", run.family_id))
      .collect();
    const members: RosterEntry[] = [];
    for (const m of memberships) {
      const u = await ctx.db.get(m.user_id);
      if (!u || u.deleted_at) continue;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
      members.push({ name, role: m.role, generation: u.generation });
    }
    members.sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));

    const memoryRows = await ctx.db
      .query("family_memories")
      .withIndex("by_family", (q) => q.eq("family_id", run.family_id))
      .collect();
    memoryRows.sort((a, b) => b._creationTime - a._creationTime);
    const memories = memoryRows.slice(0, 10).map((r) => ({
      text: r.text,
      createdAt: r._creationTime,
    }));

    // Caller self-context for the layered system prompt.
    let caller: RunContext["caller"] = null;
    const callerUser = await ctx.db.get(run.user_id);
    if (callerUser && !callerUser.deleted_at) {
      const callerMembership = memberships.find((m) => m.user_id === callerUser._id);
      const role = callerMembership?.role;
      caller = {
        firstName: callerUser.first_name,
        lastName: callerUser.last_name,
        generation: callerUser.generation,
        stewardshipPhase: callerUser.stewardship_phase,
        familyRole:
          role === "admin" || role === "member" || role === "advisor" || role === "trustee"
            ? role
            : null,
      };
    }

    return { run, thread, familyName: family?.name ?? null, members, memories, caller };
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
    // Phase 4 follow-up — bump last_message_at for recentThreads recency
    await touchThread(ctx, args.threadId);
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
      v.literal("cancelled"),
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

// Phase 7.3: persist time-to-first-token on the run row. Called once per run
// when the first content_delta event fires.
export const recordTtft = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    ttftMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { ttft_ms: args.ttftMs });
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

export const getRunStatus = internalQuery({
  args: { runId: v.id("thread_runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    return run.status;
  },
});

export const redactToolMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    runId: v.id("thread_runs"),
    toolCallId: v.string(),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return;
    const messages = [...(thread.messages ?? [])] as Array<{
      role: string;
      content: unknown;
      tool_call_id?: string;
    }>;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === "tool" && m.tool_call_id === args.toolCallId) {
        messages[i] = { ...m, content: args.newContent };
        break;
      }
    }
    await ctx.db.patch(args.threadId, { messages });
    const run = await ctx.db.get(args.runId);
    if (run) {
      const history = [...(run.history ?? [])] as Array<{
        role: string;
        content: unknown;
        tool_call_id?: string;
      }>;
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h && h.role === "tool" && h.tool_call_id === args.toolCallId) {
          history[i] = { ...h, content: args.newContent };
          break;
        }
      }
      await ctx.db.patch(args.runId, { history });
    }
  },
});
