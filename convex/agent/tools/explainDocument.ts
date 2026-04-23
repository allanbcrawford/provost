"use node";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { getOpenAI } from "../openai";

const MAX_PAGE_CHARS = 4000;
const MAX_SNIPPET_CHARS = 280;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function extractCitations(
  explanation: string,
  pages: Array<{ index: number; content: string }>,
): Array<{ page: number; snippet: string }> {
  const byIndex = new Map(pages.map((p) => [p.index, p.content]));
  const seen = new Set<number>();
  const out: Array<{ page: number; snippet: string }> = [];
  const re = /\[p\.(\d+)\]/g;
  let match: RegExpExecArray | null;
  match = re.exec(explanation);
  while (match !== null) {
    const page = Number(match[1]);
    if (!seen.has(page)) {
      seen.add(page);
      const content = byIndex.get(page) ?? "";
      out.push({ page, snippet: truncate(content.trim(), MAX_SNIPPET_CHARS) });
    }
    match = re.exec(explanation);
  }
  return out;
}

type DocumentPage = { index: number; content: string };

type LoadedDocument = {
  document: { name: string; type: string };
  pages: DocumentPage[];
};

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args }): Promise<Record<string, unknown>> => {
    const documentId = args?.documentId as Id<"documents"> | undefined;
    const pageArg = typeof args?.page === "number" ? (args.page as number) : undefined;
    if (!documentId) {
      return { success: false, error: "documentId required", widget: null };
    }

    const loaded = (await ctx.runQuery(internal.documents.loadDocumentWithPages, {
      documentId,
    })) as LoadedDocument | null;
    if (!loaded) {
      return { success: false, error: "document not found", widget: null };
    }

    const { document, pages } = loaded;
    const selectedPages =
      pageArg !== undefined ? pages.filter((p: DocumentPage) => p.index === pageArg) : pages;

    if (selectedPages.length === 0) {
      return { success: false, error: "no pages to explain", widget: null };
    }

    const pagesBlock = selectedPages
      .map((p: DocumentPage) => `--- [p.${p.index}] ---\n${truncate(p.content, MAX_PAGE_CHARS)}`)
      .join("\n\n");

    const scope =
      pageArg !== undefined
        ? `page ${pageArg} of the document titled "${document.name}"`
        : `the document titled "${document.name}"`;

    const systemPrompt =
      "You explain legal, financial, and estate-planning documents in plain language for non-experts. " +
      "Use short paragraphs. Define jargon. When referencing specific passages, emit inline citations in " +
      "the exact form `[p.<n>]` where <n> is the page index shown in the source. Only cite pages that " +
      "actually appear in the provided source.";

    const userPrompt = `Explain ${scope}.\n\nSource pages:\n\n${pagesBlock}`;

    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    let explanation = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) explanation += delta;
    }

    const citations = extractCitations(explanation, pages);

    return {
      success: true,
      widget: {
        kind: "cite",
        props: {
          documentId,
          page: pageArg ?? null,
          explanation,
          citations,
        },
      },
    };
  },
});
