import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { type Role, requireFamilyMember } from "./authz";

export type ResourceType =
  | "document"
  | "observation"
  | "signal"
  | "task"
  | "waterfall"
  | "asset"
  | "memory"
  | "message"
  | "event"
  | "lesson";

// Roles that bypass per-record party check within their family. Family admins,
// advisors, and trustees see the full family state. Plain members are subject
// to per-record ACL.
const BYPASS_ROLES = new Set<Role>(["admin", "advisor", "trustee"]);

// Per-resource-type bypass policy. Default = admins/advisors/trustees can see
// everything in their family. Override here for resource types that need
// stricter privacy. Messages = private DMs even from admins.
const BYPASS_BY_TYPE: Record<ResourceType, boolean> = {
  document: true,
  observation: true,
  signal: true,
  task: true,
  waterfall: true,
  asset: true,
  memory: true,
  event: true,
  lesson: true,
  message: false, // DMs are private even from family admins.
};

// Stage flag. While false, the helpers enforce family membership only — same
// behavior as the legacy `requireFamilyMember` path. Flip to true once Stage 3
// has populated `resource_parties` rows for all existing resources.
//
// Read at call time (not module load) so toggling via `npx convex env set`
// takes effect without a redeploy.
function partyCheckEnabled(): boolean {
  return process.env.ACL_PARTY_CHECK_ENABLED === "true";
}

type FamilyResource = { family_id: Id<"families"> };

export type AccessResult = {
  user: Doc<"users">;
  membership: Doc<"family_users">;
  bypassed: boolean;
};

async function checkParty(
  ctx: QueryCtx | MutationCtx,
  resourceType: ResourceType,
  resourceId: string,
  userId: Id<"users">,
): Promise<Doc<"resource_parties"> | null> {
  return await ctx.db
    .query("resource_parties")
    .withIndex("by_resource", (q) =>
      q.eq("resource_type", resourceType).eq("resource_id", resourceId),
    )
    .filter((q) => q.eq(q.field("user_id"), userId))
    .first();
}

// Variant for agent/system actions where there is no auth identity but a known
// acting user_id (typically run.user_id). Skips the identity round-trip and
// loads the family_users membership row directly. Used inside internalAction
// tool handlers, which run on behalf of the run's user but don't have a Clerk
// session in their ctx.
export async function assertResourceAccessForUser<T extends FamilyResource>(
  ctx: QueryCtx | MutationCtx,
  resourceType: ResourceType,
  resource: T,
  resourceId: string,
  userId: Id<"users">,
): Promise<void> {
  const membership = await ctx.db
    .query("family_users")
    .withIndex("by_family_and_user", (q) =>
      q.eq("family_id", resource.family_id).eq("user_id", userId),
    )
    .unique();
  if (!membership) {
    throw new ConvexError({
      code: "FORBIDDEN_RESOURCE",
      reason: "user not in family",
      resourceType,
      resourceId,
    });
  }

  const typeAllowsBypass = BYPASS_BY_TYPE[resourceType];
  const roleBypasses = BYPASS_ROLES.has(membership.role as Role);
  if (!partyCheckEnabled() || (typeAllowsBypass && roleBypasses)) {
    return;
  }

  const party = await checkParty(ctx, resourceType, resourceId, userId);
  if (!party) {
    throw new ConvexError({
      code: "FORBIDDEN_RESOURCE",
      resourceType,
      resourceId,
    });
  }
}

// Read gate: the caller has already loaded the resource (via ctx.db.get) and
// passes it here. We verify family membership, then — if party check is on and
// the user's role does not bypass — we verify a `resource_parties` row exists.
export async function requireResourceAccess<T extends FamilyResource>(
  ctx: QueryCtx | MutationCtx,
  resourceType: ResourceType,
  resource: T,
  resourceId: string,
): Promise<AccessResult> {
  const { user, membership } = await requireFamilyMember(ctx, resource.family_id);

  const typeAllowsBypass = BYPASS_BY_TYPE[resourceType];
  const roleBypasses = BYPASS_ROLES.has(membership.role as Role);
  const bypass = typeAllowsBypass && roleBypasses;

  if (!partyCheckEnabled() || bypass) {
    return { user, membership, bypassed: bypass };
  }

  const party = await checkParty(ctx, resourceType, String(resourceId), user._id);
  if (!party) {
    throw new ConvexError({
      code: "FORBIDDEN_RESOURCE",
      resourceType,
      resourceId: String(resourceId),
    });
  }
  return { user, membership, bypassed: false };
}

// Write gate: same as read, but the party row must be `owner` or `party`
// (viewers are read-only). Bypass roles still bypass.
export async function requireResourceWrite<T extends FamilyResource>(
  ctx: MutationCtx,
  resourceType: ResourceType,
  resource: T,
  resourceId: string,
): Promise<AccessResult> {
  const { user, membership } = await requireFamilyMember(ctx, resource.family_id);

  const typeAllowsBypass = BYPASS_BY_TYPE[resourceType];
  const roleBypasses = BYPASS_ROLES.has(membership.role as Role);
  const bypass = typeAllowsBypass && roleBypasses;

  if (!partyCheckEnabled() || bypass) {
    return { user, membership, bypassed: bypass };
  }

  const party = await checkParty(ctx, resourceType, String(resourceId), user._id);
  if (!party || party.role === "viewer") {
    throw new ConvexError({
      code: "FORBIDDEN_RESOURCE_WRITE",
      resourceType,
      resourceId: String(resourceId),
    });
  }
  return { user, membership, bypassed: false };
}

// List filter: given an array of family-scoped rows already filtered to the
// caller's family, drop any that the caller is not a party on. Bypass roles
// pass everything through. Batch-loads parties via by_user_and_type.
export async function filterByAccess<T extends FamilyResource & { _id: string }>(
  ctx: QueryCtx,
  resourceType: ResourceType,
  rows: T[],
  membership: Doc<"family_users">,
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const typeAllowsBypass = BYPASS_BY_TYPE[resourceType];
  const roleBypasses = BYPASS_ROLES.has(membership.role as Role);
  if (!partyCheckEnabled() || (typeAllowsBypass && roleBypasses)) {
    return rows;
  }

  const parties = await ctx.db
    .query("resource_parties")
    .withIndex("by_user_and_type", (q) =>
      q.eq("user_id", membership.user_id).eq("resource_type", resourceType),
    )
    .collect();
  const allowed = new Set(parties.map((p) => p.resource_id));
  return rows.filter((r) => allowed.has(String(r._id)));
}

// Write a party row. Used at resource-creation time and from explicit share UI.
// Idempotent: skips if (resource, user) already has a party row.
export async function grantParty(
  ctx: MutationCtx,
  args: {
    familyId: Id<"families">;
    resourceType: ResourceType;
    resourceId: string;
    userId: Id<"users">;
    role: "owner" | "party" | "viewer";
    grantedBy: Id<"users">;
  },
): Promise<void> {
  const existing = await checkParty(ctx, args.resourceType, args.resourceId, args.userId);
  if (existing) return;
  await ctx.db.insert("resource_parties", {
    family_id: args.familyId,
    resource_type: args.resourceType,
    resource_id: args.resourceId,
    user_id: args.userId,
    role: args.role,
    granted_by: args.grantedBy,
    granted_at: Date.now(),
  });
}
