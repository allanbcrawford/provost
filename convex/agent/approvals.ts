import type { ToolSurface } from "@provost/agent";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireFamilyMember } from "../lib/authz";

async function findPendingApproval(ctx: MutationCtx, toolCallId: string) {
  const approval = await ctx.db
    .query("tool_call_approvals")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .filter((q) => q.eq(q.field("tool_call_id"), toolCallId))
    .first();
  if (!approval) throw new ConvexError({ code: "APPROVAL_NOT_FOUND", toolCallId });
  const run = await ctx.db.get(approval.thread_run_id);
  if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });
  return { approval, run };
}

export const approve = mutation({
  args: { toolCallId: v.string() },
  handler: async (ctx, { toolCallId }) => {
    const { approval, run } = await findPendingApproval(ctx, toolCallId);
    const { user } = await requireFamilyMember(ctx, run.family_id);

    await ctx.db.patch(approval._id, {
      status: "approved",
      decided_by: user._id,
      decided_at: Date.now(),
    });

    await writeAudit(ctx, {
      familyId: run.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "approval",
      action: "tool.approve",
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

export const reject = mutation({
  args: { toolCallId: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, { toolCallId, reason }) => {
    const { approval, run } = await findPendingApproval(ctx, toolCallId);
    const { user } = await requireFamilyMember(ctx, run.family_id);

    await ctx.db.patch(approval._id, {
      status: "rejected",
      decided_by: user._id,
      decided_at: Date.now(),
      decision_reason: reason,
    });

    await writeAudit(ctx, {
      familyId: run.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "approval",
      action: "tool.reject",
      resourceType: "tool_call_approvals",
      resourceId: approval._id,
      metadata: { toolName: approval.tool_name, toolCallId, reason: reason ?? null },
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

export const listPending = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const familyRuns = await ctx.db
      .query("thread_runs")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const runIds = new Set(familyRuns.map((r) => r._id));
    const pending = await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pending.filter((a) => runIds.has(a.thread_run_id));
  },
});
