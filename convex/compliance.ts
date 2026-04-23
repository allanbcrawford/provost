import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, type QueryCtx, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

export const COMPLIANCE_PREFERENCE_KEYS = [
  "guardrails.pii_redaction",
  "guardrails.non_advice_disclaimer",
  "disclaimers.show_legal",
  "disclaimers.show_financial",
  "retention.audit_days",
] as const;

export type CompliancePreferenceKey = (typeof COMPLIANCE_PREFERENCE_KEYS)[number];

export const COMPLIANCE_DEFAULTS: Record<CompliancePreferenceKey, unknown> = {
  "guardrails.pii_redaction": true,
  "guardrails.non_advice_disclaimer": true,
  "disclaimers.show_legal": true,
  "disclaimers.show_financial": true,
  "retention.audit_days": 365,
};

async function readAllPreferences(ctx: QueryCtx, familyId: Id<"families">) {
  const rows = await ctx.db
    .query("family_preferences")
    .withIndex("by_family_and_key", (q) => q.eq("family_id", familyId))
    .collect();
  const map: Record<string, unknown> = { ...COMPLIANCE_DEFAULTS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export const getPreferences = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId, ["admin"]);
    return readAllPreferences(ctx, familyId);
  },
});

export const getDisclaimerPreferences = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const prefs = await readAllPreferences(ctx, familyId);
    return {
      "disclaimers.show_legal": prefs["disclaimers.show_legal"] !== false,
      "disclaimers.show_financial": prefs["disclaimers.show_financial"] !== false,
    };
  },
});

export const getPreferencesInternal = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    return readAllPreferences(ctx, familyId);
  },
});

export const setPreference = mutation({
  args: {
    familyId: v.id("families"),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { familyId, key, value }) => {
    const { user } = await requireFamilyMember(ctx, familyId, ["admin"]);

    const existing = await ctx.db
      .query("family_preferences")
      .withIndex("by_family_and_key", (q) => q.eq("family_id", familyId).eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("family_preferences", {
        family_id: familyId,
        key,
        value,
      });
    }

    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "compliance.preference_set",
      resourceType: "family_preferences",
      resourceId: key,
      metadata: { key, value },
    });

    return { ok: true };
  },
});
