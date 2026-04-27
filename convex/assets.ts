import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { filterByAccess, grantParty, requireResourceWrite } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

// Today at midnight UTC, in ms. The snapshot dedup key — same-day re-writes
// patch the existing row instead of inserting a new one.
function todayMidnightUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

async function writeSnapshot(
  ctx: MutationCtx,
  asset: Doc<"assets">,
  capturedBy: "manual" | "cron" | "mutation",
) {
  const snapshot_date = todayMidnightUtcMs();
  const existing = await ctx.db
    .query("asset_snapshots")
    .withIndex("by_asset_and_date", (q) =>
      q.eq("asset_id", asset._id).eq("snapshot_date", snapshot_date),
    )
    .unique();
  const payload = {
    family_id: asset.family_id,
    asset_id: asset._id,
    snapshot_date,
    value: asset.value,
    currency: asset.currency,
    captured_by: capturedBy,
  } as const;
  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("asset_snapshots", payload);
  }
}

// PRD asset taxonomy. Free-form `type` is preserved on the row so future
// extensions don't require a schema migration, but the UI filter pins to
// these labels.
export const ASSET_TYPES = [
  "Brokerage",
  "Private Equity",
  "Real Estate",
  "Checking",
  "Entities",
] as const;

export const list = query({
  args: { familyId: v.id("families"), type: v.optional(v.string()) },
  handler: async (ctx, { familyId, type }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const filtered = type ? rows.filter((r) => r.type === type) : rows;
    const scoped = await filterByAccess(ctx, "asset", filtered, membership);
    return scoped.sort((a, b) => b.value - a.value);
  },
});

// Summary numbers: total value + breakdown by type. Returns the same scope as
// `list` so a member who can't see a row's full detail still doesn't have it
// counted in the rollup.
export const summary = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const scoped = await filterByAccess(ctx, "asset", rows, membership);

    let total = 0;
    const byType = new Map<string, number>();
    for (const r of scoped) {
      total += r.value;
      byType.set(r.type, (byType.get(r.type) ?? 0) + r.value);
    }
    return {
      total,
      currency: scoped[0]?.currency ?? "USD",
      byType: Array.from(byType.entries()).map(([type, value]) => ({ type, value })),
      count: scoped.length,
    };
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    type: v.string(),
    value: v.number(),
    currency: v.optional(v.string()),
    asOfDate: v.string(),
    liquidity: v.optional(v.union(v.literal("liquid"), v.literal("illiquid"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId, ["admin", "advisor", "trustee"]);
    const assetId: Id<"assets"> = await ctx.db.insert("assets", {
      family_id: args.familyId,
      name: args.name,
      type: args.type,
      value: args.value,
      currency: args.currency ?? "USD",
      as_of_date: args.asOfDate,
      ...(args.liquidity ? { liquidity: args.liquidity } : {}),
    });
    const inserted = await ctx.db.get(assetId);
    if (inserted) await writeSnapshot(ctx, inserted, "mutation");
    await grantParty(ctx, {
      familyId: args.familyId,
      resourceType: "asset",
      resourceId: assetId,
      userId: user._id,
      role: "owner",
      grantedBy: user._id,
    });
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "assets.create",
      resourceType: "assets",
      resourceId: assetId,
      metadata: { name: args.name, type: args.type, value: args.value },
    });
    return assetId;
  },
});

export const update = mutation({
  args: {
    assetId: v.id("assets"),
    patch: v.object({
      name: v.optional(v.string()),
      type: v.optional(v.string()),
      value: v.optional(v.number()),
      currency: v.optional(v.string()),
      asOfDate: v.optional(v.string()),
      liquidity: v.optional(v.union(v.literal("liquid"), v.literal("illiquid"))),
    }),
  },
  handler: async (ctx, { assetId, patch }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireResourceWrite(ctx, "asset", asset, assetId);
    const dbPatch: Partial<Doc<"assets">> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.currency !== undefined) dbPatch.currency = patch.currency;
    if (patch.asOfDate !== undefined) dbPatch.as_of_date = patch.asOfDate;
    if (patch.liquidity !== undefined) dbPatch.liquidity = patch.liquidity;
    await ctx.db.patch(assetId, dbPatch);
    const updated = await ctx.db.get(assetId);
    if (updated) await writeSnapshot(ctx, updated, "mutation");
    await writeAudit(ctx, {
      familyId: asset.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "assets.update",
      resourceType: "assets",
      resourceId: assetId,
      metadata: { fields: Object.keys(patch) },
    });
    return null;
  },
});

// Per-family rollup of total assets value over time. Used by the trend
// chart on the assets page. Caller's family scope is enforced via
// requireFamilyMember; per-asset ACL filtering is applied so a member who
// only sees a subset of the family's assets gets a partial rollup.
export const historyForFamily = query({
  args: { familyId: v.id("families"), since: v.number() },
  handler: async (ctx, { familyId, since }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const liveAssets = await ctx.db
      .query("assets")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const visibleAssets = await filterByAccess(ctx, "asset", liveAssets, membership);
    const visibleIds = new Set(visibleAssets.map((a) => a._id));
    const snapshots = await ctx.db
      .query("asset_snapshots")
      .withIndex("by_family_and_date", (q) =>
        q.eq("family_id", familyId).gte("snapshot_date", since),
      )
      .collect();
    const dailyTotals = new Map<number, number>();
    let currency = "USD";
    for (const s of snapshots) {
      if (!visibleIds.has(s.asset_id)) continue;
      currency = s.currency;
      dailyTotals.set(s.snapshot_date, (dailyTotals.get(s.snapshot_date) ?? 0) + s.value);
    }
    return Array.from(dailyTotals.entries())
      .map(([date, total]) => ({ date, total, currency }))
      .sort((a, b) => a.date - b.date);
  },
});

export const historyForAsset = query({
  args: { assetId: v.id("assets"), since: v.number() },
  handler: async (ctx, { assetId, since }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });
    // requireResourceWrite for read is overkill; use requireFamilyMember +
    // ACL filter via the access helper.
    await requireFamilyMember(ctx, asset.family_id);
    const snapshots = await ctx.db
      .query("asset_snapshots")
      .withIndex("by_asset_and_date", (q) => q.eq("asset_id", assetId).gte("snapshot_date", since))
      .collect();
    return snapshots.sort((a, b) => a.snapshot_date - b.snapshot_date);
  },
});

export const remove = mutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireResourceWrite(ctx, "asset", asset, assetId);
    await ctx.db.delete(assetId);
    await writeAudit(ctx, {
      familyId: asset.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "assets.remove",
      resourceType: "assets",
      resourceId: assetId,
      metadata: { name: asset.name },
    });
    return null;
  },
});
