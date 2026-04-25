"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

type Hit = {
  id: string;
  kind: "document" | "lesson" | "library_source";
  title: string;
  snippet: string;
  score: number;
};

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (
    ctx,
    { args, runId },
  ): Promise<{ success: true; hits: Hit[]; widget: { kind: string; props: unknown } }> => {
    const query = String(args?.query ?? "").trim();
    const limit = Math.min(Math.max(Number(args?.limit ?? 6), 1), 25);
    if (!query) {
      return {
        success: true,
        hits: [],
        widget: { kind: "knowledge-results", props: { query, hits: [] } },
      };
    }

    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });
    const familyId = run.family_id;
    const userId = run.user_id;

    const embedding: number[] = await ctx.runAction(internal.agent.embed.embedText, {
      text: query,
    });

    // Search each vector index in parallel; filter to this family.
    const [docHits, lessonHits, libraryHits] = await Promise.all([
      ctx.vectorSearch("documents", "by_embedding", {
        vector: embedding,
        limit,
        filter: (q) => q.eq("family_id", familyId),
      }),
      ctx.vectorSearch("lessons", "by_embedding", {
        vector: embedding,
        limit,
        filter: (q) => q.eq("family_id", familyId),
      }),
      // library_sources.family_id is optional, but we want family-scoped
      // results only — globals are site-admin authoring content and must
      // not surface to family-scoped agent searches.
      ctx.vectorSearch("library_sources", "by_embedding", {
        vector: embedding,
        limit,
        filter: (q) => q.eq("family_id", familyId),
      }),
    ]);

    // Hydrate rows so we can return human-readable snippets.
    const hydrated: Hit[] = [];
    for (const h of docHits) {
      const doc = await ctx.runQuery(internal.agent.knowledgeHydrate.getDocument, {
        documentId: h._id as Id<"documents">,
        familyId,
        userId,
      });
      if (!doc) continue;
      hydrated.push({
        id: doc._id,
        kind: "document",
        title: doc.name,
        snippet: doc.summary ?? doc.description ?? "",
        score: h._score,
      });
    }
    for (const h of lessonHits) {
      const lesson = await ctx.runQuery(internal.agent.knowledgeHydrate.getLesson, {
        lessonId: h._id as Id<"lessons">,
        familyId,
        userId,
      });
      if (!lesson) continue;
      hydrated.push({
        id: lesson._id,
        kind: "lesson",
        title: lesson.title,
        snippet: lesson.description ?? "",
        score: h._score,
      });
    }
    for (const h of libraryHits) {
      const src = await ctx.runQuery(internal.agent.knowledgeHydrate.getLibrarySource, {
        sourceId: h._id as Id<"library_sources">,
        familyId,
      });
      if (!src) continue;
      hydrated.push({
        id: src._id,
        kind: "library_source",
        title: src.title,
        snippet: src.snippet ?? "",
        score: h._score,
      });
    }

    hydrated.sort((a, b) => b.score - a.score);
    const top = hydrated.slice(0, limit);

    return {
      success: true,
      hits: top,
      widget: { kind: "knowledge-results", props: { query, hits: top } },
    };
  },
});
