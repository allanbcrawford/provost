import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";
import { checkAndIncrement } from "./lib/rateLimit";

async function loadFamilyMembers(ctx: QueryCtx, familyId: Id<"families">) {
  const memberships = await ctx.db
    .query("family_users")
    .withIndex("by_family", (q) => q.eq("family_id", familyId))
    .collect();
  const users = await Promise.all(memberships.map((m) => ctx.db.get(m.user_id)));
  return users.flatMap((u) => (u && !u.deleted_at ? [u] : []));
}

export const getGraph = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const [users, documents, professionals] = await Promise.all([
      loadFamilyMembers(ctx, familyId),
      ctx.db
        .query("documents")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect(),
      ctx.db.query("professionals").collect(),
    ]);
    const liveDocs = documents.filter((d) => !d.deleted_at);
    return { members: users, documents: liveDocs, professionals };
  },
});

export const getMember = query({
  args: { familyId: v.id("families"), memberId: v.id("users") },
  handler: async (ctx, { familyId, memberId }) => {
    await requireFamilyMember(ctx, familyId);
    const membership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", memberId))
      .unique();
    if (!membership) throw new ConvexError({ code: "NOT_IN_FAMILY" });
    return await ctx.db.get(memberId);
  },
});

export const getDocument = query({
  args: { familyId: v.id("families"), documentId: v.id("documents") },
  handler: async (ctx, { familyId, documentId }) => {
    await requireFamilyMember(ctx, familyId);
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.family_id !== familyId) throw new ConvexError({ code: "NOT_FOUND" });
    return doc;
  },
});

export const updateMember = mutation({
  args: {
    familyId: v.id("families"),
    memberId: v.id("users"),
    patch: v.object({
      first_name: v.optional(v.string()),
      middle_name: v.optional(v.string()),
      last_name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone_number: v.optional(v.string()),
      date_of_birth: v.optional(v.string()),
      home_location: v.optional(v.string()),
      education: v.optional(v.string()),
      learning_path: v.optional(v.string()),
      generation: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { familyId, memberId, patch }) => {
    const { user } = await requireFamilyMember(ctx, familyId, ["admin"]);
    const membership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", memberId))
      .unique();
    if (!membership) throw new ConvexError({ code: "NOT_IN_FAMILY" });
    await ctx.db.patch(memberId, patch);
    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "family.update_member",
      resourceType: "users",
      resourceId: memberId,
      metadata: { fields: Object.keys(patch) },
    });
  },
});

export const createMember = mutation({
  args: {
    familyId: v.id("families"),
    first_name: v.string(),
    last_name: v.string(),
    middle_name: v.optional(v.string()),
    email: v.string(),
    phone_number: v.optional(v.string()),
    date_of_birth: v.optional(v.string()),
    home_location: v.optional(v.string()),
    education: v.optional(v.string()),
    learning_path: v.optional(v.string()),
    generation: v.number(),
    role: v.union(v.literal("admin"), v.literal("member")),
    familyRole: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("advisor"),
      v.literal("trustee"),
    ),
    father_id: v.optional(v.id("users")),
    mother_id: v.optional(v.id("users")),
    spouse_id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { user: actor } = await requireFamilyMember(ctx, args.familyId, ["admin"]);
    await checkAndIncrement(ctx, "tool.invite_member:family", args.familyId);
    const userId = await ctx.db.insert("users", {
      first_name: args.first_name,
      middle_name: args.middle_name,
      last_name: args.last_name,
      email: args.email,
      phone_number: args.phone_number,
      date_of_birth: args.date_of_birth,
      home_location: args.home_location,
      education: args.education,
      role: args.role,
      generation: args.generation,
      father_id: args.father_id,
      mother_id: args.mother_id,
      spouse_id: args.spouse_id,
      clerk_user_id: `provisional:${args.email}`,
      learning_path: args.learning_path,
      onboarding_status: "pending",
    });
    await ctx.db.insert("family_users", {
      family_id: args.familyId,
      user_id: userId,
      role: args.familyRole,
    });
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: actor._id,
      actorKind: "user",
      category: "mutation",
      action: "family.create_member",
      resourceType: "users",
      resourceId: userId,
      metadata: { familyRole: args.familyRole, role: args.role },
    });
    return userId;
  },
});
