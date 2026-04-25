import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

const stewardshipPhase = v.union(
  v.literal("emerging"),
  v.literal("developing"),
  v.literal("operating"),
  v.literal("enduring"),
);

// Family-scoped list. Members see all programs in their family — programs are
// the curriculum scaffold, not personal data.
export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("programs")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    return rows.filter((p) => !p.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
  },
});

export const get = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, { programId }) => {
    const program = await ctx.db.get(programId);
    if (!program || program.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, program.family_id);
    return program;
  },
});

// Admin/advisor-only authoring.
export const create = mutation({
  args: {
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    stewardshipPhase,
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId, ["admin", "advisor"]);
    const sortOrder = args.sortOrder ?? Date.now();
    const programId: Id<"programs"> = await ctx.db.insert("programs", {
      family_id: args.familyId,
      title: args.title,
      description: args.description,
      stewardship_phase: args.stewardshipPhase,
      sort_order: sortOrder,
    });
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "programs.create",
      resourceType: "programs",
      resourceId: programId,
      metadata: { title: args.title, stewardshipPhase: args.stewardshipPhase },
    });
    return programId;
  },
});
