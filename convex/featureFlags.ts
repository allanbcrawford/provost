// Feature flag query + admin mutations. Family members call get(key) and
// receive {enabled} resolved against the global flag + their family's
// override list. Site admins call listAll / toggleGlobal / toggleForFamily
// for the admin console.

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { maybeUserRecord, requireSiteAdmin } from "./lib/authz";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const user = await maybeUserRecord(ctx);
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!flag) return { enabled: false };
    if (flag.enabled) return { enabled: true };
    // Disabled globally — check the caller's family overrides.
    if (!user) return { enabled: false };
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    for (const m of memberships) {
      if (flag.family_overrides.includes(m.family_id)) return { enabled: true };
    }
    return { enabled: false };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireSiteAdmin(ctx);
    return await ctx.db.query("feature_flags").collect();
  },
});

export const toggleGlobal = mutation({
  args: { key: v.string(), enabled: v.boolean() },
  handler: async (ctx, { key, enabled }) => {
    const admin = await requireSiteAdmin(ctx);
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!flag) throw new ConvexError({ code: "FLAG_NOT_FOUND", key });
    await ctx.db.patch(flag._id, { enabled });
    await writeAudit(ctx, {
      actorUserId: admin._id,
      actorKind: "user",
      category: "mutation",
      action: "feature_flags.toggle_global",
      resourceType: "feature_flags",
      resourceId: String(flag._id),
      metadata: { key, enabled, previous: flag.enabled },
    });
    return null;
  },
});

export const toggleForFamily = mutation({
  args: { key: v.string(), familyId: v.id("families"), enabled: v.boolean() },
  handler: async (ctx, { key, familyId, enabled }) => {
    const admin = await requireSiteAdmin(ctx);
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!flag) throw new ConvexError({ code: "FLAG_NOT_FOUND", key });
    const has = flag.family_overrides.includes(familyId);
    let next = flag.family_overrides;
    if (enabled && !has) next = [...flag.family_overrides, familyId];
    else if (!enabled && has) next = flag.family_overrides.filter((id) => id !== familyId);
    if (next === flag.family_overrides) return null;
    await ctx.db.patch(flag._id, { family_overrides: next });
    await writeAudit(ctx, {
      familyId,
      actorUserId: admin._id,
      actorKind: "user",
      category: "mutation",
      action: "feature_flags.toggle_for_family",
      resourceType: "feature_flags",
      resourceId: String(flag._id),
      metadata: { key, enabled },
    });
    return null;
  },
});
