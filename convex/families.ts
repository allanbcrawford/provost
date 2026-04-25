import { v } from "convex/values";
import { query } from "./_generated/server";
import { maybeUserRecord } from "./lib/authz";

// Returns null when the caller is signed out or unprovisioned. Called from
// useUserRole, which can render briefly during sign-out before the consuming
// component unmounts; throwing UNAUTHENTICATED there surfaces as a runtime
// error in the browser. Authorization for write paths must use
// requireFamilyMember directly, not this query.
export const getMembership = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const user = await maybeUserRecord(ctx);
    if (!user) return null;
    return await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", user._id))
      .unique();
  },
});

// Called from the family-bootstrap mount path on first sign-in. Returns []
// (rather than throwing) when the user row hasn't been provisioned yet so the
// app shell doesn't surface a console error during the brief window between
// Clerk sign-in and getOrProvisionFromClerk completing.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await maybeUserRecord(ctx);
    if (!user) return [];
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
