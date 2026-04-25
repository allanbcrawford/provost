import type { ToolSurface } from "@provost/agent";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

async function assertThreadAccess(
  ctx: QueryCtx | MutationCtx,
  thread: Doc<"threads">,
  userId: Id<"users">,
) {
  if (thread.creator_id === userId) return;
  const shared = await ctx.db
    .query("thread_users")
    .withIndex("by_thread_and_user", (q) => q.eq("thread_id", thread._id).eq("user_id", userId))
    .unique();
  if (!shared) throw new ConvexError({ code: "THREAD_FORBIDDEN", threadId: thread._id });
}

export const getEvents = query({
  args: { threadRunId: v.id("thread_runs") },
  handler: async (ctx, { threadRunId }) => {
    const run = await ctx.db.get(threadRunId);
    if (!run) return [];
    const thread = await ctx.db.get(run.thread_id);
    if (!thread) return [];
    const { user } = await requireFamilyMember(ctx, run.family_id);
    await assertThreadAccess(ctx, thread, user._id);
    const rows = await ctx.db
      .query("run_events")
      .withIndex("by_thread_run_and_sequence", (q) => q.eq("thread_run_id", threadRunId))
      .collect();
    return rows.map((r) => ({
      type: r.type,
      sequence: r.sequence,
      data: r.data,
      timestamp: r._creationTime,
    }));
  },
});

export const list = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) return [];
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadAccess(ctx, thread, user._id);

    const runs = await ctx.db
      .query("thread_runs")
      .withIndex("by_thread", (q) => q.eq("thread_id", threadId))
      .collect();
    runs.sort((a, b) => b._creationTime - a._creationTime);
    return runs;
  },
});

export const cancel = mutation({
  args: { threadRunId: v.id("thread_runs") },
  handler: async (ctx, { threadRunId }) => {
    const run = await ctx.db.get(threadRunId);
    if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });
    const thread = await ctx.db.get(run.thread_id);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, run.family_id);
    await assertThreadAccess(ctx, thread, user._id);

    if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      return { ok: true, alreadyTerminal: true };
    }

    await ctx.db.patch(threadRunId, {
      status: "cancelled",
      finished_at: Date.now(),
    });

    // Emit a run_finished event so subscribing clients see the terminal state
    // even if the background action is already idle (e.g. waiting on OpenAI).
    const existing = await ctx.db
      .query("run_events")
      .withIndex("by_thread_run_and_sequence", (q) => q.eq("thread_run_id", threadRunId))
      .collect();
    await ctx.db.insert("run_events", {
      thread_run_id: threadRunId,
      thread_id: run.thread_id,
      sequence: existing.length + 1,
      type: "run_finished",
      data: { reason: "cancelled", cancelledBy: user._id },
    });

    await writeAudit(ctx, {
      familyId: run.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "run",
      action: "agent.run.cancelled",
      resourceType: "thread_runs",
      resourceId: threadRunId,
    });

    return { ok: true, alreadyTerminal: false };
  },
});

export const submit = mutation({
  args: {
    toolCallId: v.string(),
    result: v.any(),
  },
  handler: async (ctx, { toolCallId, result }) => {
    const approval = await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_tool_call_id", (q) => q.eq("tool_call_id", toolCallId))
      .first();
    if (!approval) throw new ConvexError({ code: "APPROVAL_NOT_FOUND", toolCallId });
    const run = await ctx.db.get(approval.thread_run_id);
    if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });
    const thread = await ctx.db.get(run.thread_id);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });

    const { user } = await requireFamilyMember(ctx, run.family_id);
    await assertThreadAccess(ctx, thread, user._id);

    if (approval.status !== "pending") {
      throw new ConvexError({ code: "APPROVAL_ALREADY_DECIDED", status: approval.status });
    }

    await ctx.db.patch(approval._id, {
      status: "approved",
      decided_by: user._id,
      decided_at: Date.now(),
      submitted_result: result,
    });

    await writeAudit(ctx, {
      familyId: run.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "approval",
      action: "tool.submit",
      resourceType: "tool_call_approvals",
      resourceId: approval._id,
      metadata: { toolName: approval.tool_name, toolCallId },
    });

    await ctx.scheduler.runAfter(0, internal.agent.runActions.resumeAfterApproval, {
      runId: run._id,
      route: (run.route ?? "any") as ToolSurface,
      selection: run.selection ?? null,
      visibleState: run.visible_state,
    });

    return { ok: true };
  },
});
