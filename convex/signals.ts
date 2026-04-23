import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";
import { computeSignals } from "./lib/signalRules";

export const listOpen = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    return rows.filter((s) => s.status === "open" || s.status === "drafting");
  },
});

export const listAll = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    return await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
  },
});

export const listObservations = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("observations")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    return rows.filter((o) => !o.deleted_at);
  },
});

export const getSignal = internalQuery({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    return await ctx.db.get(signalId);
  },
});

export const updateStatus = mutation({
  args: {
    signalId: v.id("signals"),
    status: v.union(
      v.literal("open"),
      v.literal("drafting"),
      v.literal("sent_to_planner"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
  },
  handler: async (ctx, { signalId, status }) => {
    const signal = await ctx.db.get(signalId);
    if (!signal) return null;
    await requireFamilyMember(ctx, signal.family_id);
    await ctx.db.patch(signalId, { status });
    return null;
  },
});

export const generateFromRules = mutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);

    const [members, documents, professionals, existing] = await Promise.all([
      ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect()
        .then(async (rows) => {
          const users = await Promise.all(rows.map((r) => ctx.db.get(r.user_id)));
          return users.filter((u): u is Doc<"users"> => u !== null && !u.deleted_at);
        }),
      ctx.db
        .query("documents")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect()
        .then((rows) => rows.filter((d) => !d.deleted_at)),
      ctx.db.query("professionals").collect(),
      ctx.db
        .query("signals")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect(),
    ]);

    const ruleSignals = computeSignals({ members, documents, professionals });

    const byKey = new Map<string, Doc<"signals">>();
    for (const s of existing) {
      if (s.source === "rule" && s.rule_key) byKey.set(s.rule_key, s);
    }

    let inserted = 0;
    let updated = 0;
    const seenKeys = new Set<string>();
    for (const rs of ruleSignals) {
      seenKeys.add(rs.rule_key);
      const prior = byKey.get(rs.rule_key);
      if (prior) {
        if (prior.status === "resolved" || prior.status === "dismissed") continue;
        await ctx.db.patch(prior._id, {
          severity: rs.severity,
          category: rs.category,
          title: rs.title,
          reason: rs.reason,
          suggested_action: rs.suggested_action,
          member_ids: rs.member_ids,
          related_document_id: rs.related_document_id,
          suggested_professional_id: rs.suggested_professional_id,
        });
        updated++;
      } else {
        await ctx.db.insert("signals", {
          family_id: familyId,
          severity: rs.severity,
          category: rs.category,
          title: rs.title,
          reason: rs.reason,
          suggested_action: rs.suggested_action,
          member_ids: rs.member_ids,
          related_document_id: rs.related_document_id,
          suggested_professional_id: rs.suggested_professional_id,
          status: "open",
          source: "rule",
          rule_key: rs.rule_key,
        });
        inserted++;
      }
    }

    return { inserted, updated, total: ruleSignals.length, seen: seenKeys.size };
  },
});
