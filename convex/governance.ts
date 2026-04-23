import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

const AUDIT_CATEGORIES = v.union(
  v.literal("mutation"),
  v.literal("tool_call"),
  v.literal("run"),
  v.literal("auth"),
  v.literal("approval"),
);

export const auditEvents = query({
  args: {
    familyId: v.id("families"),
    category: v.optional(AUDIT_CATEGORIES),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { familyId, category, limit }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);
    const take = Math.min(Math.max(limit ?? 100, 1), 500);
    const events = category
      ? await ctx.db
          .query("audit_events")
          .withIndex("by_family_and_category", (q) =>
            q.eq("family_id", familyId).eq("category", category),
          )
          .order("desc")
          .take(take)
      : await ctx.db
          .query("audit_events")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .order("desc")
          .take(take);
    return events;
  },
});

export const pendingApprovals = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);
    const familyRuns = await ctx.db
      .query("thread_runs")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const runIds = new Set(familyRuns.map((r) => r._id));
    const pending = await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const matched = pending.filter((a) => runIds.has(a.thread_run_id));
    const requesterIds = Array.from(new Set(matched.map((a) => a.requested_by)));
    const requesters = await Promise.all(requesterIds.map((id) => ctx.db.get(id)));
    const requesterMap = new Map(
      requesters
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, u] as const),
    );
    return matched.map((a) => ({
      ...a,
      requester: requesterMap.get(a.requested_by)
        ? {
            name: `${requesterMap.get(a.requested_by)!.first_name} ${requesterMap.get(a.requested_by)!.last_name}`,
            email: requesterMap.get(a.requested_by)!.email,
          }
        : null,
    }));
  },
});

export const tasks = query({
  args: {
    familyId: v.id("families"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, { familyId, status }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);
    const rows = status
      ? await ctx.db
          .query("tasks")
          .withIndex("by_family_and_status", (q) =>
            q.eq("family_id", familyId).eq("status", status),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("tasks")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .order("desc")
          .collect();
    return rows;
  },
});
