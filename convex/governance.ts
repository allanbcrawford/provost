import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

const AUDIT_CATEGORIES = v.union(
  v.literal("mutation"),
  v.literal("tool_call"),
  v.literal("run"),
  v.literal("auth"),
  v.literal("approval"),
);

const ACTOR_KINDS = v.union(v.literal("user"), v.literal("system"), v.literal("agent"));

export const auditEvents = query({
  args: {
    familyId: v.id("families"),
    paginationOpts: paginationOptsValidator,
    category: v.optional(AUDIT_CATEGORIES),
    actorKind: v.optional(ACTOR_KINDS),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { familyId, paginationOpts, category, actorKind, from, to, search }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);

    const baseQuery = category
      ? ctx.db
          .query("audit_events")
          .withIndex("by_family_and_category", (q) =>
            q.eq("family_id", familyId).eq("category", category),
          )
      : ctx.db.query("audit_events").withIndex("by_family", (q) => q.eq("family_id", familyId));

    const searchLc = search?.trim().toLowerCase() ?? "";

    const hasIndexFilter = actorKind !== undefined || from !== undefined || to !== undefined;
    const filtered = hasIndexFilter
      ? baseQuery.filter((q) => {
          const conditions = [
            actorKind !== undefined ? q.eq(q.field("actor_kind"), actorKind) : null,
            from !== undefined ? q.gte(q.field("_creationTime"), from) : null,
            to !== undefined ? q.lte(q.field("_creationTime"), to) : null,
          ].filter((c): c is NonNullable<typeof c> => c !== null);
          return q.and(...conditions);
        })
      : baseQuery;

    const result = await filtered.order("desc").paginate(paginationOpts);

    const searchFiltered: Doc<"audit_events">[] = searchLc
      ? result.page.filter((e) =>
          [e.action, e.resource_type ?? "", e.resource_id ?? "", e.category].some((s) =>
            s.toLowerCase().includes(searchLc),
          ),
        )
      : result.page;

    const actorIds = Array.from(
      new Set(
        searchFiltered
          .map((e) => e.actor_user_id)
          .filter((id): id is Id<"users"> => id !== undefined),
      ),
    );
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const actorMap = new Map<Id<"users">, { name: string; email: string }>();
    actors.forEach((u) => {
      if (u) actorMap.set(u._id, { name: `${u.first_name} ${u.last_name}`, email: u.email });
    });

    const page = searchFiltered.map((e) => ({
      ...e,
      actor:
        e.actor_user_id && actorMap.get(e.actor_user_id) ? actorMap.get(e.actor_user_id)! : null,
    }));

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
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
            name: `${requesterMap.get(a.requested_by)?.first_name} ${requesterMap.get(a.requested_by)?.last_name}`,
            email: requesterMap.get(a.requested_by)?.email,
          }
        : null,
    }));
  },
});

export const recentDecisions = query({
  args: { familyId: v.id("families"), limit: v.optional(v.number()) },
  handler: async (ctx, { familyId, limit }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);
    const familyRuns = await ctx.db
      .query("thread_runs")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const runIds = new Set(familyRuns.map((r) => r._id));

    const approved = await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const rejected = await ctx.db
      .query("tool_call_approvals")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();

    const decided = [...approved, ...rejected].filter(
      (a) => runIds.has(a.thread_run_id) && a.decided_at !== undefined,
    );
    decided.sort((a, b) => (b.decided_at ?? 0) - (a.decided_at ?? 0));
    const sliced = decided.slice(0, limit ?? 20);

    const userIds = Array.from(
      new Set(
        sliced
          .flatMap((a) => [a.requested_by, a.decided_by])
          .filter((id): id is Id<"users"> => id !== undefined),
      ),
    );
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, { name: `${u.first_name} ${u.last_name}`, email: u.email }] as const),
    );

    return sliced.map((a) => ({
      ...a,
      requester: userMap.get(a.requested_by) ?? null,
      decider: a.decided_by ? (userMap.get(a.decided_by) ?? null) : null,
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
