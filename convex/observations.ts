import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { filterByAccess, requireResourceAccess, requireResourceWrite } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

export const listByFamily = query({
  args: {
    familyId: v.id("families"),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, { familyId, documentId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = documentId
      ? await ctx.db
          .query("observations")
          .withIndex("by_document", (q) => q.eq("document_id", documentId))
          .collect()
      : await ctx.db
          .query("observations")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
    const active = rows.filter((o) => !o.deleted_at);
    const scoped = await filterByAccess(ctx, "observation", active, membership);
    return scoped.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const markDone = mutation({
  args: { observationId: v.id("observations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new ConvexError({ code: "NOT_FOUND" });
    await requireResourceWrite(ctx, "observation", obs, observationId);
    await ctx.db.patch(observationId, { status: "done" });
    // Phase 7.1 — audit coverage on observation approval
    await writeAudit(ctx, {
      familyId: obs.family_id,
      actorKind: "user",
      category: "mutation",
      action: "observations.approved",
      resourceType: "observations",
      resourceId: observationId,
      metadata: { before: obs.status, after: "done" },
    });
    return null;
  },
});

export const markRead = mutation({
  args: { observationId: v.id("observations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new ConvexError({ code: "NOT_FOUND" });
    await requireResourceAccess(ctx, "observation", obs, observationId);
    if (obs.status === "new") {
      await ctx.db.patch(observationId, { status: "read" });
      // Phase 7.1 — audit coverage on observation dismissal/read
      await writeAudit(ctx, {
        familyId: obs.family_id,
        actorKind: "user",
        category: "mutation",
        action: "observations.dismissed",
        resourceType: "observations",
        resourceId: observationId,
        metadata: { before: "new", after: "read" },
      });
    }
    return null;
  },
});
