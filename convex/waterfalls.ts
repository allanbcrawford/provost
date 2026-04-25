// Waterfall queries — wraps the pure engine in `convex/waterfallEngine.ts`
// with DB loading and per-document ACL gating. Frontend reads via
// `api.waterfalls.compute` to drive the diagram and the unallocated panel.

import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { filterByAccess, requireResourceAccess } from "./lib/acl";
import { requireFamilyMember } from "./lib/authz";
import { type EngineAsset, type EngineDocument, compute as runEngine } from "./waterfallEngine";

const deathOrderValidator = v.union(
  v.literal("robert-first"),
  v.literal("linda-first"),
  v.literal("simultaneous"),
);

export const compute = query({
  args: {
    familyId: v.id("families"),
    selectedDocumentIds: v.array(v.id("documents")),
    deathOrder: deathOrderValidator,
    customEdits: v.optional(v.any()),
    revisions: v.optional(
      v.object({
        addResiduaryToSpouse: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireFamilyMember(ctx, args.familyId);

    // Per-document ACL: every selected doc must be readable by the caller.
    // requireResourceAccess throws on failure, which surfaces as a 403 to
    // the client (consistent with the rest of the API).
    const documents: EngineDocument[] = [];
    for (const documentId of args.selectedDocumentIds) {
      const doc = await ctx.db.get(documentId);
      if (!doc || doc.deleted_at) {
        throw new ConvexError({ code: "DOCUMENT_NOT_FOUND" });
      }
      if (doc.family_id !== args.familyId) {
        throw new ConvexError({ code: "DOCUMENT_FAMILY_MISMATCH" });
      }
      await requireResourceAccess(ctx, "document", doc, documentId);
      documents.push({
        _id: doc._id,
        name: doc.name,
        state: doc.state,
      });
    }

    // Assets are family-scoped + filtered by the asset ACL. The engine math
    // works against this scoped pool so a user who can't see an asset
    // doesn't see it allocated either.
    const assetRows = await ctx.db
      .query("assets")
      .withIndex("by_family", (q) => q.eq("family_id", args.familyId))
      .collect();
    const scopedAssets = await filterByAccess(ctx, "asset", assetRows, membership);

    const assets: EngineAsset[] = scopedAssets.map((a) => ({
      _id: a._id,
      name: a.name,
      type: a.type,
      value: a.value,
      currency: a.currency,
    }));

    return runEngine({
      familyId: args.familyId,
      selectedDocumentIds: args.selectedDocumentIds,
      deathOrder: args.deathOrder,
      customEdits: (args.customEdits ?? {}) as Record<string, unknown> & {
        spouseBeneficiaryId?: string;
      },
      revisions: args.revisions ?? {},
      assets,
      documents,
    });
  },
});
