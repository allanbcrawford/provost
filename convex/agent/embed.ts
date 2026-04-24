"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getOpenAI } from "./openai";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims — matches schema vectorIndexes

export const embedText = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, { text }): Promise<number[]> => {
    const openai = getOpenAI();
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    const vec = res.data[0]?.embedding;
    if (!vec) throw new Error("embed: empty response");
    return vec as number[];
  },
});

/**
 * One-shot backfill: embeds every document/lesson/library_source that is
 * missing an embedding. Run via `npx convex run agent/embed:backfill`.
 */
export const backfill = internalAction({
  args: {},
  handler: async (ctx): Promise<{ documents: number; lessons: number; librarySources: number }> => {
    const missing: {
      documents: Array<{ _id: string; name: string; summary?: string; description?: string }>;
      lessons: Array<{ _id: string; title: string; description?: string }>;
      library_sources: Array<{ _id: string; title: string; content?: string }>;
    } = await ctx.runQuery(internal.agent.embedInternal.listMissing, {});

    let documents = 0;
    let lessons = 0;
    let librarySources = 0;

    for (const d of missing.documents) {
      const text = [d.name, d.summary ?? "", d.description ?? ""].filter(Boolean).join("\n");
      if (!text.trim()) continue;
      const embedding = await ctx.runAction(internal.agent.embed.embedText, { text });
      await ctx.runMutation(internal.agent.embedInternal.patchDocumentEmbedding, {
        documentId: d._id as never,
        embedding,
      });
      documents++;
    }
    for (const l of missing.lessons) {
      const text = [l.title, l.description ?? ""].filter(Boolean).join("\n");
      if (!text.trim()) continue;
      const embedding = await ctx.runAction(internal.agent.embed.embedText, { text });
      await ctx.runMutation(internal.agent.embedInternal.patchLessonEmbedding, {
        lessonId: l._id as never,
        embedding,
      });
      lessons++;
    }
    for (const s of missing.library_sources) {
      const text = [s.title, (s.content ?? "").slice(0, 2000)].filter(Boolean).join("\n");
      if (!text.trim()) continue;
      const embedding = await ctx.runAction(internal.agent.embed.embedText, { text });
      await ctx.runMutation(internal.agent.embedInternal.patchLibrarySourceEmbedding, {
        sourceId: s._id as never,
        embedding,
      });
      librarySources++;
    }

    return { documents, lessons, librarySources };
  },
});
