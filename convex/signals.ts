import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import {
  assertResourceAccessForUser,
  filterByAccess,
  grantParty,
  requireResourceAccess,
} from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";
import { computeSignals } from "./lib/signalRules";

// Members only see signals where review_status is "approved" (or undefined,
// which means pre-feature rows that are implicitly approved). Admins,
// advisors, and trustees see all states so they can curate the queue.
function isVisibleToMember(s: Doc<"signals">): boolean {
  return s.review_status === undefined || s.review_status === "approved";
}

export const listOpen = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const open = rows.filter((s) => s.status === "open" || s.status === "drafting");
    const reviewFiltered = membership.role === "member" ? open.filter(isVisibleToMember) : open;
    return await filterByAccess(ctx, "signal", reviewFiltered, membership);
  },
});

export const listAll = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const reviewFiltered = membership.role === "member" ? rows.filter(isVisibleToMember) : rows;
    return await filterByAccess(ctx, "signal", reviewFiltered, membership);
  },
});

// Queue for advisors / family admins. Returns pending_review signals
// scoped to the family. Members are not allowed to call this.
export const listPendingReview = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId, [
      "admin",
      "advisor",
      "trustee",
    ]);
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const pending = rows.filter((s) => s.review_status === "pending_review");
    return await filterByAccess(ctx, "signal", pending, membership);
  },
});

export const countPendingReview = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    if (membership.role === "member") return 0;
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    return rows.filter((s) => s.review_status === "pending_review").length;
  },
});

export const approveSignal = mutation({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const signal = await ctx.db.get(signalId);
    if (!signal) return null;
    const { user } = await requireFamilyMember(ctx, signal.family_id, [
      "admin",
      "advisor",
      "trustee",
    ]);
    await ctx.db.patch(signalId, { review_status: "approved" });
    await writeAudit(ctx, {
      familyId: signal.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "signals.approve",
      resourceType: "signals",
      resourceId: signalId,
      metadata: { previousReview: signal.review_status ?? "approved" },
    });
    return null;
  },
});

export const dismissSignal = mutation({
  args: { signalId: v.id("signals"), reason: v.optional(v.string()) },
  handler: async (ctx, { signalId, reason }) => {
    const signal = await ctx.db.get(signalId);
    if (!signal) return null;
    const { user } = await requireFamilyMember(ctx, signal.family_id, [
      "admin",
      "advisor",
      "trustee",
    ]);
    await ctx.db.patch(signalId, { review_status: "dismissed" });
    await writeAudit(ctx, {
      familyId: signal.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "signals.dismiss",
      resourceType: "signals",
      resourceId: signalId,
      metadata: { reason: reason ?? null, previousReview: signal.review_status ?? "approved" },
    });
    return null;
  },
});

export const listObservations = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("observations")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const active = rows.filter((o) => !o.deleted_at);
    return await filterByAccess(ctx, "observation", active, membership);
  },
});

export const getSignal = internalQuery({
  args: {
    signalId: v.id("signals"),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { signalId, familyId, userId }) => {
    const signal = await ctx.db.get(signalId);
    if (!signal) return null;
    if (signal.family_id !== familyId) return null;
    if (userId) {
      try {
        await assertResourceAccessForUser(ctx, "signal", signal, signalId, userId);
      } catch {
        return null;
      }
    }
    return signal;
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
    const { user } = await requireResourceAccess(ctx, "signal", signal, signalId);
    await ctx.db.patch(signalId, { status });
    await writeAudit(ctx, {
      familyId: signal.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "signals.update_status",
      resourceType: "signals",
      resourceId: signalId,
      metadata: { status, previousStatus: signal.status },
    });
    return null;
  },
});

export const generateFromRules = mutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);

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
      ctx.db
        .query("professionals")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect(),
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
        const newSignalId = await ctx.db.insert("signals", {
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
        await grantParty(ctx, {
          familyId,
          resourceType: "signal",
          resourceId: newSignalId,
          userId: user._id,
          role: "owner",
          grantedBy: user._id,
        });
        for (const memberId of rs.member_ids) {
          await grantParty(ctx, {
            familyId,
            resourceType: "signal",
            resourceId: newSignalId,
            userId: memberId,
            role: "party",
            grantedBy: user._id,
          });
        }
        inserted++;
      }
    }

    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "signals.generate_from_rules",
      resourceType: "signals",
      metadata: { inserted, updated, total: ruleSignals.length, seen: seenKeys.size },
    });

    return { inserted, updated, total: ruleSignals.length, seen: seenKeys.size };
  },
});
