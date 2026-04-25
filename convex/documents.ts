import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import {
  assertResourceAccessForUser,
  filterByAccess,
  grantParty,
  requireResourceAccess,
} from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";

export const list = query({
  args: {
    familyId: v.id("families"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { familyId, category }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const active = docs.filter((d) => !d.deleted_at);
    const filtered = category ? active.filter((d) => d.category === category) : active;
    const scoped = await filterByAccess(ctx, "document", filtered, membership);
    return scoped.sort((a, b) => b._creationTime - a._creationTime);
  },
});

async function resolveFileUrl(
  ctx: {
    db: { get: (id: Id<"files">) => Promise<Doc<"files"> | null> };
    storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> };
  },
  fileId: Id<"files"> | undefined,
) {
  if (!fileId) return { file: null, fileUrl: null };
  const file = await ctx.db.get(fileId);
  if (!file) return { file: null, fileUrl: null };
  const fileUrl = await ctx.storage.getUrl(file.storage_id);
  return { file, fileUrl };
}

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.deleted_at) return null;
    await requireResourceAccess(ctx, "document", doc, documentId);
    const { file, fileUrl } = await resolveFileUrl(ctx, doc.file_id);
    return { ...doc, file, fileUrl };
  },
});

export const listPages = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND" });
    await requireResourceAccess(ctx, "document", doc, documentId);
    return await ctx.db
      .query("pages")
      .withIndex("by_document_and_index", (q) => q.eq("document_id", documentId))
      .collect();
  },
});

export const loadDocumentWithPages = internalQuery({
  args: {
    documentId: v.id("documents"),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { documentId, familyId, userId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.deleted_at) return null;
    if (doc.family_id !== familyId) return null;
    if (userId) {
      try {
        await assertResourceAccessForUser(ctx, "document", doc, documentId, userId);
      } catch {
        return null;
      }
    }
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_document_and_index", (q) => q.eq("document_id", documentId))
      .collect();
    pages.sort((a, b) => a.index - b.index);
    return { document: doc, pages };
  },
});

export const uploadUrl = mutation({
  args: { contentType: v.optional(v.string()) },
  handler: async (ctx, _args) => {
    await requireUserRecord(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    description: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.string(),
    type: v.string(),
    creatorName: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileHash: v.optional(v.string()),
    observationType: v.optional(v.union(v.literal("observation"), v.literal("danger"))),
    // Versioning (P3.3). When `parentDocumentId` is set, the new row is a
    // newer version of the parent. Versions inherit ACL parties from the
    // parent at creation time so they stay visible to the same audience.
    parentDocumentId: v.optional(v.id("documents")),
    versionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId, ["admin"]);

    if (args.parentDocumentId) {
      const parent = await ctx.db.get(args.parentDocumentId);
      if (!parent || parent.deleted_at) {
        throw new ConvexError({ code: "PARENT_NOT_FOUND" });
      }
      if (parent.family_id !== args.familyId) {
        throw new ConvexError({ code: "PARENT_FAMILY_MISMATCH" });
      }
    }

    let fileId: Id<"files"> | undefined;
    if (args.storageId) {
      fileId = await ctx.db.insert("files", {
        user_id: user._id,
        name: args.fileName ?? args.name,
        type: args.fileType ?? "application/pdf",
        size: args.fileSize ?? 0,
        hash: args.fileHash ?? "",
        storage_id: args.storageId,
      });
    }

    const documentId = await ctx.db.insert("documents", {
      family_id: args.familyId,
      file_id: fileId,
      name: args.name,
      description: args.description,
      summary: args.summary,
      category: args.category,
      type: args.type,
      creator_name: args.creatorName,
      observation_type: args.observationType ?? "observation",
      observation_is_observed: false,
      parent_document_id: args.parentDocumentId,
      version_date: args.versionDate,
    });
    await grantParty(ctx, {
      familyId: args.familyId,
      resourceType: "document",
      resourceId: documentId,
      userId: user._id,
      role: "owner",
      grantedBy: user._id,
    });
    // Inherit ACL parties from the parent so the new version is visible to
    // the same set of family members without manual re-sharing.
    if (args.parentDocumentId) {
      const parentParties = await ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) =>
          q.eq("resource_type", "document").eq("resource_id", args.parentDocumentId as string),
        )
        .collect();
      for (const p of parentParties) {
        if (p.user_id === user._id) continue; // already owner of the new doc
        await grantParty(ctx, {
          familyId: args.familyId,
          resourceType: "document",
          resourceId: documentId,
          userId: p.user_id,
          role: p.role === "owner" ? "party" : p.role,
          grantedBy: user._id,
        });
      }
    }
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "documents.create",
      resourceType: "documents",
      resourceId: documentId,
      metadata: {
        category: args.category,
        type: args.type,
        hasFile: Boolean(fileId),
        parentDocumentId: args.parentDocumentId ?? null,
      },
    });
    return documentId;
  },
});

// Returns the version chain for a document — every row that shares the same
// "lineage" (this doc plus any rows whose parent_document_id chains back to
// the same root). Sorted by version_date ascending; rows missing a date sort
// last by _creationTime.
export const listVersions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.deleted_at) return [];
    await requireResourceAccess(ctx, "document", doc, documentId);

    // Walk to the root.
    let rootId: Id<"documents"> = doc._id;
    let cursor = doc;
    const seen = new Set<string>();
    while (cursor.parent_document_id) {
      const idStr = String(cursor.parent_document_id);
      if (seen.has(idStr)) break; // safety against cycles
      seen.add(idStr);
      const parent = await ctx.db.get(cursor.parent_document_id);
      if (!parent || parent.deleted_at) break;
      rootId = parent._id;
      cursor = parent;
    }

    // BFS forward from root via by_parent.
    const all: Doc<"documents">[] = [];
    const queue: Id<"documents">[] = [rootId];
    while (queue.length > 0) {
      const next = queue.shift()!;
      const node = await ctx.db.get(next);
      if (!node || node.deleted_at) continue;
      all.push(node);
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parent_document_id", next))
        .collect();
      for (const c of children) {
        if (!c.deleted_at) queue.push(c._id);
      }
    }

    return all
      .sort((a, b) => {
        const ad = a.version_date ?? Number.POSITIVE_INFINITY;
        const bd = b.version_date ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return a._creationTime - b._creationTime;
      })
      .map((d) => ({
        _id: d._id,
        name: d.name,
        version_date: d.version_date ?? null,
        is_current: d._id === documentId,
      }));
  },
});
