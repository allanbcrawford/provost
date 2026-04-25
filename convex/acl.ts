import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { grantParty, type ResourceType } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";
import { type RESOURCE_TYPES, resourceTypeValidator } from "./schema_parts/acl";

const partyRoleValidator = v.union(v.literal("owner"), v.literal("party"), v.literal("viewer"));

// Resolves the family that owns a given resource. Returns null if the resource
// type is not known or the row is missing.
async function resolveResourceFamily(
  ctx: QueryCtx,
  resourceType: ResourceType,
  resourceId: string,
): Promise<{ familyId: Id<"families">; resourceExists: boolean } | null> {
  const tableByType: Partial<Record<ResourceType, string>> = {
    document: "documents",
    observation: "observations",
    signal: "signals",
    task: "tasks",
    waterfall: "waterfalls",
    asset: "assets",
    memory: "family_memories",
    lesson: "lessons",
  };
  const table = tableByType[resourceType];
  if (!table) return null;
  // ctx.db.get accepts an Id; we cast through unknown since resource_id is
  // stored as a string and the table is determined dynamically.
  const row = await ctx.db.get(resourceId as unknown as Id<"documents">);
  if (!row) return { familyId: "" as Id<"families">, resourceExists: false };
  const familyId = (row as { family_id?: Id<"families"> }).family_id;
  if (!familyId) return { familyId: "" as Id<"families">, resourceExists: false };
  return { familyId, resourceExists: true };
}

// List who can see a resource. Caller must themselves have access to the
// resource's family (any role in that family qualifies — listing parties is
// not a sensitive operation, it's a transparency view).
export const listParties = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceType, resourceId }) => {
    const resolved = await resolveResourceFamily(ctx, resourceType, resourceId);
    if (!resolved || !resolved.resourceExists) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    await requireFamilyMember(ctx, resolved.familyId);

    const parties = await ctx.db
      .query("resource_parties")
      .withIndex("by_resource", (q) =>
        q.eq("resource_type", resourceType).eq("resource_id", resourceId),
      )
      .collect();

    const userIds = Array.from(new Set(parties.map((p) => p.user_id)));
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is Doc<"users"> => u !== null)
        .map(
          (u) =>
            [
              u._id,
              {
                name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
                email: u.email,
              },
            ] as const,
        ),
    );

    return parties.map((p) => ({
      _id: p._id,
      user_id: p.user_id,
      role: p.role,
      granted_at: p.granted_at,
      user: userMap.get(p.user_id) ?? null,
    }));
  },
});

// Add a party to a resource. Caller must be admin/advisor in the resource's
// family OR the resource's existing owner.
export const addParty = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    userId: v.id("users"),
    role: partyRoleValidator,
  },
  handler: async (ctx, { resourceType, resourceId, userId, role }) => {
    const resolved = await resolveResourceFamily(ctx, resourceType, resourceId);
    if (!resolved || !resolved.resourceExists) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    const { user, membership } = await requireFamilyMember(ctx, resolved.familyId);

    // Authorization: admin/advisor/trustee can always grant. Otherwise the
    // caller must be the owner of this specific resource.
    const isBypass =
      membership.role === "admin" || membership.role === "advisor" || membership.role === "trustee";
    if (!isBypass) {
      const callerParty = await ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) =>
          q.eq("resource_type", resourceType).eq("resource_id", resourceId),
        )
        .filter((q) => q.eq(q.field("user_id"), user._id))
        .first();
      if (!callerParty || callerParty.role !== "owner") {
        throw new ConvexError({ code: "FORBIDDEN_GRANT" });
      }
    }

    // The target user must be in the same family.
    const targetMembership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) =>
        q.eq("family_id", resolved.familyId).eq("user_id", userId),
      )
      .unique();
    if (!targetMembership) {
      throw new ConvexError({ code: "TARGET_NOT_IN_FAMILY" });
    }

    await grantParty(ctx, {
      familyId: resolved.familyId,
      resourceType,
      resourceId,
      userId,
      role,
      grantedBy: user._id,
    });

    await writeAudit(ctx, {
      familyId: resolved.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "acl.add_party",
      resourceType: "resource_parties",
      resourceId,
      metadata: { resourceType, targetUserId: userId, role },
    });

    return { ok: true };
  },
});

// Remove a party. Same gate as addParty. Cannot remove the last owner —
// every resource must keep at least one owner so it remains administrable.
export const removeParty = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { resourceType, resourceId, userId }) => {
    const resolved = await resolveResourceFamily(ctx, resourceType, resourceId);
    if (!resolved || !resolved.resourceExists) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    const { user, membership } = await requireFamilyMember(ctx, resolved.familyId);

    const isBypass =
      membership.role === "admin" || membership.role === "advisor" || membership.role === "trustee";
    if (!isBypass) {
      const callerParty = await ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) =>
          q.eq("resource_type", resourceType).eq("resource_id", resourceId),
        )
        .filter((q) => q.eq(q.field("user_id"), user._id))
        .first();
      if (!callerParty || callerParty.role !== "owner") {
        throw new ConvexError({ code: "FORBIDDEN_GRANT" });
      }
    }

    const target = await ctx.db
      .query("resource_parties")
      .withIndex("by_resource", (q) =>
        q.eq("resource_type", resourceType).eq("resource_id", resourceId),
      )
      .filter((q) => q.eq(q.field("user_id"), userId))
      .first();
    if (!target) {
      return { ok: true, alreadyAbsent: true };
    }

    if (target.role === "owner") {
      const allParties = await ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) =>
          q.eq("resource_type", resourceType).eq("resource_id", resourceId),
        )
        .collect();
      const ownerCount = allParties.filter((p) => p.role === "owner").length;
      if (ownerCount <= 1) {
        throw new ConvexError({ code: "CANNOT_REMOVE_LAST_OWNER" });
      }
    }

    await ctx.db.delete(target._id);

    await writeAudit(ctx, {
      familyId: resolved.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "acl.remove_party",
      resourceType: "resource_parties",
      resourceId,
      metadata: { resourceType, targetUserId: userId, removedRole: target.role },
    });

    return { ok: true, alreadyAbsent: false };
  },
});

// Type aid — re-export for callers.
export type { RESOURCE_TYPES, ResourceType };
