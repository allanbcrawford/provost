import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const listMissing = internalQuery({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    const lessons = await ctx.db.query("lessons").collect();
    const librarySources = await ctx.db.query("library_sources").collect();
    return {
      documents: documents
        .filter((d) => !d.embedding && !d.deleted_at)
        .map((d) => ({
          _id: d._id,
          name: d.name,
          summary: d.summary,
          description: d.description,
        })),
      lessons: lessons
        .filter((l) => !l.embedding && !l.deleted_at)
        .map((l) => ({ _id: l._id, title: l.title, description: l.description })),
      library_sources: librarySources
        .filter((s) => !s.embedding)
        .map((s) => ({ _id: s._id, title: s.title, content: s.content })),
    };
  },
});

export const patchDocumentEmbedding = internalMutation({
  args: { documentId: v.id("documents"), embedding: v.array(v.float64()) },
  handler: async (ctx, { documentId, embedding }) => {
    await ctx.db.patch(documentId, { embedding });
  },
});

export const patchLessonEmbedding = internalMutation({
  args: { lessonId: v.id("lessons"), embedding: v.array(v.float64()) },
  handler: async (ctx, { lessonId, embedding }) => {
    await ctx.db.patch(lessonId, { embedding });
  },
});

export const patchLibrarySourceEmbedding = internalMutation({
  args: { sourceId: v.id("library_sources"), embedding: v.array(v.float64()) },
  handler: async (ctx, { sourceId, embedding }) => {
    await ctx.db.patch(sourceId, { embedding });
  },
});
