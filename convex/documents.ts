import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";

export const list = query({
  args: {
    familyId: v.id("families"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { familyId, category }) => {
    await requireFamilyMember(ctx, familyId);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const active = docs.filter((d) => !d.deleted_at);
    const filtered = category ? active.filter((d) => d.category === category) : active;
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
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
    await requireFamilyMember(ctx, doc.family_id);
    const { file, fileUrl } = await resolveFileUrl(ctx, doc.file_id);
    return { ...doc, file, fileUrl };
  },
});

export const listPages = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND" });
    await requireFamilyMember(ctx, doc.family_id);
    return await ctx.db
      .query("pages")
      .withIndex("by_document_and_index", (q) => q.eq("document_id", documentId))
      .collect();
  },
});

export const loadDocumentWithPages = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.deleted_at) return null;
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
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId, ["admin"]);

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

    return await ctx.db.insert("documents", {
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
    });
  },
});
