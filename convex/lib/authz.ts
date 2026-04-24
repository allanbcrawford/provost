import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

export type Role = "admin" | "member" | "advisor" | "trustee";

export async function requireUser(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
  return identity;
}

export async function requireUserRecord(ctx: QueryCtx | MutationCtx) {
  const identity = await requireUser(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
    .unique();
  if (!user) throw new ConvexError({ code: "USER_NOT_PROVISIONED" });
  return user;
}

export async function requireFamilyMember(
  ctx: QueryCtx | MutationCtx,
  familyId: Id<"families">,
  allowedRoles?: Role[],
) {
  const user = await requireUserRecord(ctx);
  const membership = await ctx.db
    .query("family_users")
    .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", user._id))
    .unique();
  if (!membership) throw new ConvexError({ code: "FORBIDDEN", familyId });
  if (allowedRoles && !allowedRoles.includes(membership.role as Role)) {
    throw new ConvexError({
      code: "FORBIDDEN_ROLE",
      required: allowedRoles,
      actual: membership.role,
    });
  }
  return { user, membership };
}

export async function requireSiteAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserRecord(ctx);
  if (user.is_site_admin !== true) {
    throw new ConvexError({ code: "FORBIDDEN_SITE_ADMIN" });
  }
  return user;
}
