import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserRecord } from "./lib/authz";

export const getMembership = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const user = await requireUserRecord(ctx);
    return await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", user._id))
      .unique();
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const families = await Promise.all(memberships.map((m) => ctx.db.get(m.family_id)));
    return families
      .map((f, i) => {
        const m = memberships[i];
        if (!f || !m) return null;
        return { ...f, myRole: m.role };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  },
});
