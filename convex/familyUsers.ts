// Membership lifecycle mutations. Admin-only — family admins can move
// members between pending / invited / active / dormant / suspended.
// Suspended memberships keep the family_users row but are rejected by
// requireFamilyMember (lib/authz.ts), so the user loses access without
// us deleting the membership history.

import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

export const setLifecycleStatus = mutation({
  args: {
    familyId: v.id("families"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("invited"),
      v.literal("active"),
      v.literal("dormant"),
      v.literal("suspended"),
    ),
  },
  handler: async (ctx, { familyId, userId, status }) => {
    const { user: actor } = await requireFamilyMember(ctx, familyId, ["admin"]);
    const target = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", userId))
      .unique();
    if (!target) throw new ConvexError({ code: "NOT_FOUND", familyId, userId });
    const previous = target.lifecycle_status ?? "active";
    if (previous === status) return { membershipId: target._id, action: "noop" as const };
    await ctx.db.patch(target._id, { lifecycle_status: status });
    await writeAudit(ctx, {
      familyId,
      actorUserId: actor._id,
      actorKind: "user",
      category: "mutation",
      action: "family.set_lifecycle_status",
      resourceType: "family_user",
      resourceId: String(target._id),
      metadata: { previous, status, userId: String(userId) },
    });
    return { membershipId: target._id, action: "patched" as const, previous, status };
  },
});
