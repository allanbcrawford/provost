import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

export const listByFamily = query({
  args: {
    familyId: v.id("families"),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, { familyId, documentId }) => {
    await requireFamilyMember(ctx, familyId);
    const rows = documentId
      ? await ctx.db
          .query("observations")
          .withIndex("by_document", (q) => q.eq("document_id", documentId))
          .collect()
      : await ctx.db
          .query("observations")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
    return rows.filter((o) => !o.deleted_at).sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const markDone = mutation({
  args: { observationId: v.id("observations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, obs.family_id);
    await ctx.db.patch(observationId, { status: "done" });
    return null;
  },
});

export const markRead = mutation({
  args: { observationId: v.id("observations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, obs.family_id);
    if (obs.status === "new") {
      await ctx.db.patch(observationId, { status: "read" });
    }
    return null;
  },
});
