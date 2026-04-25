import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { filterByAccess, grantParty, requireResourceWrite } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

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
