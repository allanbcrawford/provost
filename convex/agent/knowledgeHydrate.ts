import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { assertResourceAccessForUser } from "../lib/acl";

export const getDocument = internalQuery({
  args: {
    documentId: v.id("documents"),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { documentId, familyId, userId }) => {
    const d = await ctx.db.get(documentId);
    if (!d || d.deleted_at) return null;
    if (d.family_id !== familyId) return null;
    if (userId) {
      try {
        await assertResourceAccessForUser(ctx, "document", d, documentId, userId);
      } catch {
        return null;
      }
    }
    return { _id: d._id, name: d.name, summary: d.summary, description: d.description };
  },
});

export const getLesson = internalQuery({
  args: {
    lessonId: v.id("lessons"),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { lessonId, familyId, userId }) => {
    const l = await ctx.db.get(lessonId);
    if (!l || l.deleted_at) return null;
    if (l.family_id !== familyId) return null;
    // Lessons skip per-record ACL today (governed by lesson_users assignments).
    // userId is accepted for API consistency but not party-checked. P0b will
    // restructure lesson visibility when Programs/Tracks land.
    void userId;
    return { _id: l._id, title: l.title, description: l.description };
  },
});

export const getLibrarySource = internalQuery({
  args: {
    sourceId: v.id("library_sources"),
    familyId: v.optional(v.id("families")),
  },
  handler: async (ctx, { sourceId, familyId }) => {
    const s = await ctx.db.get(sourceId);
    if (!s) return null;
    // Globals (family_id undefined) are site-admin-only authoring scaffolding
    // and must not surface to family-scoped agent searches. Drop them
    // unconditionally here. Drop cross-family rows too.
    if (!s.family_id) return null;
    if (familyId && s.family_id !== familyId) return null;
    const snippet = (s.content ?? "").slice(0, 300);
    return { _id: s._id, title: s.title, snippet };
  },
});
