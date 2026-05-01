// Issue 6.2 — Family History timeline + Values statement.
//
// Public queries / mutations powering the History and Values tabs on the
// Family page. `recordEvent` is exposed both as an internal helper (called
// from other mutations when high-signal events happen) and as a public
// mutation gated to admin/advisor for manual entries. `backfillFromExistingData`
// is explicit-trigger-only — it never runs on deploy.

import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

const HISTORY_KIND = v.union(
  v.literal("member_added"),
  v.literal("member_removed"),
  v.literal("document_executed"),
  v.literal("observation_resolved"),
  v.literal("event_held"),
  v.literal("manual"),
);

export type HistoryKind =
  | "member_added"
  | "member_removed"
  | "document_executed"
  | "observation_resolved"
  | "event_held"
  | "manual";

// ---------------------------------------------------------------------------
// Internal helper — called directly from other mutations to record an event
// without going through ctx.runMutation. Keep this signature stable.
// ---------------------------------------------------------------------------
export async function recordHistoryEvent(
  ctx: MutationCtx,
  args: {
    familyId: Id<"families">;
    kind: HistoryKind;
    title: string;
    description?: string;
    occurredAt?: number;
    actorUserId?: Id<"users">;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
): Promise<Id<"family_history_events">> {
  const now = Date.now();
  return await ctx.db.insert("family_history_events", {
    family_id: args.familyId,
    kind: args.kind,
    title: args.title,
    description: args.description,
    occurred_at: args.occurredAt ?? now,
    actor_user_id: args.actorUserId,
    related_entity_type: args.relatedEntityType,
    related_entity_id: args.relatedEntityId,
    created_at: now,
  });
}

// ---------------------------------------------------------------------------
// listEvents — History tab data source. Returns rows ordered by semantic
// occurred_at desc (newest first), with the actor's display name resolved.
// ---------------------------------------------------------------------------
export const listEvents = query({
  args: {
    familyId: v.id("families"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { familyId, limit }) => {
    await requireFamilyMember(ctx, familyId);
    const cap = Math.min(Math.max(limit ?? 50, 1), 200);
    const rows = await ctx.db
      .query("family_history_events")
      .withIndex("by_family_occurred", (q) => q.eq("family_id", familyId))
      .order("desc")
      .take(cap);

    // Resolve actor names for display. Cache by id so we only fetch each
    // user once per request.
    const actorCache = new Map<string, string | null>();
    const out = await Promise.all(
      rows.map(async (r) => {
        let actorName: string | null = null;
        if (r.actor_user_id) {
          const key = String(r.actor_user_id);
          if (actorCache.has(key)) {
            actorName = actorCache.get(key) ?? null;
          } else {
            const u = await ctx.db.get(r.actor_user_id);
            actorName = u ? `${u.first_name} ${u.last_name}`.trim() : null;
            actorCache.set(key, actorName);
          }
        }
        return {
          _id: r._id,
          kind: r.kind,
          title: r.title,
          description: r.description ?? null,
          occurred_at: r.occurred_at,
          actor_user_id: r.actor_user_id ?? null,
          actor_name: actorName,
          related_entity_type: r.related_entity_type ?? null,
          related_entity_id: r.related_entity_id ?? null,
        };
      }),
    );
    return out;
  },
});

// ---------------------------------------------------------------------------
// recordEvent — public mutation for manual ("Add note") entries. Internal
// codepaths should call recordHistoryEvent() directly instead.
// ---------------------------------------------------------------------------
export const recordEvent = mutation({
  args: {
    familyId: v.id("families"),
    kind: HISTORY_KIND,
    title: v.string(),
    description: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId, [
      "admin",
      "advisor",
    ]);
    const id = await recordHistoryEvent(ctx, {
      familyId: args.familyId,
      kind: args.kind,
      title: args.title,
      description: args.description,
      occurredAt: args.occurredAt,
      actorUserId: user._id,
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
    });
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "family.history.record",
      resourceType: "family_history_events",
      resourceId: String(id),
      metadata: { kind: args.kind },
    });
    return id;
  },
});

// ---------------------------------------------------------------------------
// updateValuesStatement — Values tab editor. Gated to admin/advisor.
// ---------------------------------------------------------------------------
export const updateValuesStatement = mutation({
  args: {
    familyId: v.id("families"),
    statement: v.string(),
  },
  handler: async (ctx, { familyId, statement }) => {
    const { user } = await requireFamilyMember(ctx, familyId, [
      "admin",
      "advisor",
    ]);
    const trimmed = statement.trim();
    await ctx.db.patch(familyId, {
      values_statement: trimmed.length > 0 ? trimmed : undefined,
      values_updated_at: Date.now(),
      values_updated_by: user._id,
    });
    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "family.values.updated",
      resourceType: "families",
      resourceId: String(familyId),
      metadata: { length: trimmed.length },
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// getValuesStatement — Values tab read-side. Returns the statement and the
// last-edited caption fields with the editor's name resolved.
// ---------------------------------------------------------------------------
export const getValuesStatement = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const family = await ctx.db.get(familyId);
    if (!family) throw new ConvexError({ code: "NOT_FOUND" });
    let updatedByName: string | null = null;
    if (family.values_updated_by) {
      const u = await ctx.db.get(family.values_updated_by);
      updatedByName = u ? `${u.first_name} ${u.last_name}`.trim() : null;
    }
    return {
      statement: family.values_statement ?? null,
      updated_at: family.values_updated_at ?? null,
      updated_by_name: updatedByName,
    };
  },
});

// ---------------------------------------------------------------------------
// listFunFacts — surface used by the Fun Facts tab. The existing fun-facts
// detail route consumes a single row; this gives the tab a list to render.
// ---------------------------------------------------------------------------
export const listFunFacts = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    return await ctx.db
      .query("fun_facts")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// backfillFromExistingData — explicit-trigger-only. Scans the past 90 days
// of activity and creates matching history rows. Idempotent: skips rows
// whose (kind, related_entity_id) already exist.
// ---------------------------------------------------------------------------
export const backfillFromExistingData = mutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId, [
      "admin",
      "advisor",
    ]);
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - NINETY_DAYS_MS;

    // Index existing rows by (kind, related_entity_id) so we don't double-write.
    const existing = await ctx.db
      .query("family_history_events")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const seen = new Set(
      existing.map((e) => `${e.kind}:${e.related_entity_id ?? ""}`),
    );

    let inserted = 0;

    // 1. member_added — every family_users row created in the past 90 days.
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    for (const m of memberships) {
      if (m._creationTime < cutoff) continue;
      const key = `member_added:${m.user_id}`;
      if (seen.has(key)) continue;
      const member = await ctx.db.get(m.user_id);
      const name = member
        ? `${member.first_name} ${member.last_name}`.trim()
        : "Family member";
      await recordHistoryEvent(ctx, {
        familyId,
        kind: "member_added",
        title: `${name} joined the family`,
        occurredAt: m._creationTime,
        relatedEntityType: "user",
        relatedEntityId: String(m.user_id),
      });
      seen.add(key);
      inserted++;
    }

    // 2. document_executed — documents created in the last 90 days.
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    for (const d of docs) {
      if (d.deleted_at) continue;
      const occurred = d.version_date ?? d._creationTime;
      if (occurred < cutoff) continue;
      const key = `document_executed:${d._id}`;
      if (seen.has(key)) continue;
      await recordHistoryEvent(ctx, {
        familyId,
        kind: "document_executed",
        title: `${d.name} added`,
        description: d.summary ?? d.description,
        occurredAt: occurred,
        relatedEntityType: "document",
        relatedEntityId: String(d._id),
      });
      seen.add(key);
      inserted++;
    }

    // 3. observation_resolved — observations whose status is 'done'.
    const obs = await ctx.db
      .query("observations")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    for (const o of obs) {
      if (o.deleted_at) continue;
      if (o.status !== "done") continue;
      if (o._creationTime < cutoff) continue;
      const key = `observation_resolved:${o._id}`;
      if (seen.has(key)) continue;
      await recordHistoryEvent(ctx, {
        familyId,
        kind: "observation_resolved",
        title: o.title,
        description: o.description,
        occurredAt: o._creationTime,
        relatedEntityType: "observation",
        relatedEntityId: String(o._id),
      });
      seen.add(key);
      inserted++;
    }

    // 4. event_held — calendar events whose end time is in the past.
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const now = Date.now();
    for (const e of events) {
      if (e.deleted_at) continue;
      if (e.ends_at > now) continue;
      if (e.ends_at < cutoff) continue;
      const key = `event_held:${e._id}`;
      if (seen.has(key)) continue;
      await recordHistoryEvent(ctx, {
        familyId,
        kind: "event_held",
        title: e.title,
        description: e.recap ?? e.description,
        occurredAt: e.ends_at,
        relatedEntityType: "event",
        relatedEntityId: String(e._id),
      });
      seen.add(key);
      inserted++;
    }

    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "family.history.backfilled",
      metadata: { inserted },
    });

    return { inserted };
  },
});

