import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { writeAudit } from "../lib/audit";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const buildFamilyDigests = internalQuery({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    const since = Date.now() - WEEK_MS;

    const out: Array<{
      familyId: string;
      familyName: string;
      admins: Array<{ userId: string; email: string; name: string }>;
      pendingApprovals: number;
      newSignals: number;
      openTasks: number;
    }> = [];

    for (const f of families) {
      if (f.deleted_at) continue;

      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();

      const admins: Array<{ userId: string; email: string; name: string }> = [];
      for (const m of memberships) {
        if (m.role !== "admin") continue;
        const u = await ctx.db.get(m.user_id);
        if (!u || u.deleted_at) continue;
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
        admins.push({ userId: u._id as string, email: u.email, name });
      }

      const familyRuns = await ctx.db
        .query("thread_runs")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const runIds = new Set(familyRuns.map((r) => r._id));
      const pending = await ctx.db
        .query("tool_call_approvals")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect();
      const pendingApprovals = pending.filter((a) => runIds.has(a.thread_run_id)).length;

      const signals = await ctx.db
        .query("signals")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const newSignals = signals.filter((s) => s._creationTime >= since).length;

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_family_and_status", (q) => q.eq("family_id", f._id).eq("status", "open"))
        .collect();

      out.push({
        familyId: f._id as string,
        familyName: f.name,
        admins,
        pendingApprovals,
        newSignals,
        openTasks: tasks.length,
      });
    }

    return out;
  },
});

export const recordDelivery = internalMutation({
  args: {
    familyId: v.id("families"),
    pendingApprovals: v.number(),
    newSignals: v.number(),
    openTasks: v.number(),
  },
  handler: async (ctx, args) => {
    await writeAudit(ctx, {
      familyId: args.familyId as Id<"families">,
      actorKind: "system",
      category: "mutation",
      action: "digest.weekly.queued",
      resourceType: "families",
      resourceId: args.familyId,
      metadata: {
        pendingApprovals: args.pendingApprovals,
        newSignals: args.newSignals,
        openTasks: args.openTasks,
      },
    });
  },
});
