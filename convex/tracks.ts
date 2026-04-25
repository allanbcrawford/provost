import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

export const listByProgram = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, { programId }) => {
    const program = await ctx.db.get(programId);
    if (!program || program.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, program.family_id);
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_program", (q) => q.eq("program_id", programId))
      .collect();
    return rows.filter((t) => !t.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
  },
});

export const create = mutation({
  args: {
    programId: v.id("programs"),
    title: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, program.family_id, ["admin", "advisor"]);
    const sortOrder = args.sortOrder ?? Date.now();
    const trackId: Id<"tracks"> = await ctx.db.insert("tracks", {
      program_id: args.programId,
      family_id: program.family_id,
      title: args.title,
      description: args.description,
      sort_order: sortOrder,
    });
    await writeAudit(ctx, {
      familyId: program.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "tracks.create",
      resourceType: "tracks",
      resourceId: trackId,
      metadata: { title: args.title, programId: args.programId },
    });
    return trackId;
  },
});
