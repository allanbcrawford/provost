import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { writeAudit } from "./lib/audit";

// Companion mutation for bootstrap:inviteSiteAdmin. Creates (or finds) the
// users row for the invitee and flips is_site_admin = true so the flag is
// preserved when the user completes Clerk sign-up and the row is claimed by
// getOrProvisionFromClerk.
export const provisionSiteAdminRow = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { is_site_admin: true });
      await writeAudit(ctx, {
        actorUserId: existing._id,
        actorKind: "system",
        category: "auth",
        action: "site_admin.granted",
        resourceType: "user",
        resourceId: String(existing._id),
        metadata: { email, via: "bootstrap" },
      });
      return { userId: existing._id, alreadyExisted: true };
    }

    const userId = await ctx.db.insert("users", {
      first_name: "",
      last_name: "",
      email,
      role: "admin",
      generation: 2,
      clerk_user_id: `pending-invite-${email}`,
      onboarding_status: "pending",
      is_site_admin: true,
    });
    await writeAudit(ctx, {
      actorUserId: userId,
      actorKind: "system",
      category: "auth",
      action: "site_admin.invited",
      resourceType: "user",
      resourceId: String(userId),
      metadata: { email, via: "bootstrap" },
    });
    return { userId, alreadyExisted: false };
  },
});
