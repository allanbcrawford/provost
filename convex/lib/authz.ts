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

// Soft variant — returns null if the user is signed out or has no provisioned
// row yet. Use this in queries that fire on first render after sign-in,
// before getOrProvisionFromClerk has had a chance to mint the user row.
export async function maybeUserRecord(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
    .unique();
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

// Site-admin is an internal-only flag for seeding, curation, and migrations.
// Provost has NO user-facing "Provost Admin" role in production — families are
// the top-level tenant boundary and there is no super-user across families.
// `is_site_admin` should only be set on internal Provost team accounts via
// `npx convex run users:promoteSiteAdmin`. Do not expose this in product UI.
export async function requireSiteAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserRecord(ctx);
  if (user.is_site_admin !== true) {
    throw new ConvexError({ code: "FORBIDDEN_SITE_ADMIN" });
  }
  return user;
}
