// V8-runtime helpers for williamsBackfill.ts. The action lives in a
// "use node" module and so cannot define queries / mutations directly.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const findDocumentByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const matches = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("name"), name))
      .collect();
    return matches.find((d) => !d.deleted_at) ?? null;
  },
});

// Pick any admin from a family to own the files rows. Real uploads attach
// the actual uploader; for the backfill we just need a stable user id with
// admin rights on the family the document belongs to.
export const findFamilyAdmin = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const admin = memberships.find((m) => m.role === "admin");
    if (!admin) return null;
    return admin.user_id;
  },
});

export const linkDocumentFile = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    fileHash: v.string(),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      user_id: args.userId,
      name: args.fileName,
      type: args.fileType,
      size: args.fileSize,
      hash: args.fileHash,
      storage_id: args.storageId,
    });
    await ctx.db.patch(args.documentId, { file_id: fileId });
  },
});

export const replacePages = internalMutation({
  args: {
    documentId: v.id("documents"),
    pages: v.array(v.object({ index: v.number(), content: v.string() })),
  },
  handler: async (ctx, { documentId, pages }) => {
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_document_and_index", (q) => q.eq("document_id", documentId))
      .collect();
    for (const p of existing) {
      await ctx.db.delete(p._id);
    }
    for (const p of pages) {
      await ctx.db.insert("pages", {
        document_id: documentId,
        index: p.index,
        content: p.content,
      });
    }
  },
});
