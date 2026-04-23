"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { getOpenAI } from "../openai";

const MAX_PAGE_CHARS = 4000;
const MAX_SNIPPET_CHARS = 280;

type ProfessionalHint = "attorney" | "accountant" | "estate_planner" | "trust_officer" | null;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function extractCitations(
  markdown: string,
  pages: Array<{ index: number; content: string }>,
): Array<{ page: number; snippet: string }> {
  const byIndex = new Map(pages.map((p) => [p.index, p.content]));
  const seen = new Set<number>();
  const out: Array<{ page: number; snippet: string }> = [];
  const re = /\[p\.(\d+)\]/g;
  let match: RegExpExecArray | null;
  match = re.exec(markdown);
  while (match !== null) {
    const page = Number(match[1]);
    if (!seen.has(page)) {
      seen.add(page);
      const content = byIndex.get(page) ?? "";
      out.push({ page, snippet: truncate(content.trim(), MAX_SNIPPET_CHARS) });
    }
    match = re.exec(markdown);
  }
  return out;
}

function extractProfessionalHint(markdown: string): ProfessionalHint {
  const lower = markdown.toLowerCase();
  if (/\battorney\b|\blawyer\b|\bcounsel\b/.test(lower)) return "attorney";
  if (/\baccountant\b|\bcpa\b|\btax advisor\b/.test(lower)) return "accountant";
  if (/\btrust officer\b|\btrustee\b/.test(lower)) return "trust_officer";
  if (/\bestate planner\b|\bestate planning\b/.test(lower)) return "estate_planner";
  return null;
}

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args }) => {
    const signalId = args?.signalId as Id<"signals"> | undefined;
    const documentId = args?.documentId as Id<"documents"> | undefined;
    const instructions =
      typeof args?.instructions === "string" ? (args.instructions as string) : "";

    if (!signalId) {
      return { success: false, error: "signalId required", widget: null };
    }

    const signal = await ctx.runQuery(internal.signals.getSignal, { signalId });
    if (!signal) {
      return { success: false, error: "signal not found", widget: null };
    }

    const resolvedDocId = documentId ?? signal.related_document_id ?? undefined;

    let documentName: string | null = null;
    let documentType: string | null = null;
    let pages: Array<{ index: number; content: string }> = [];
    if (resolvedDocId) {
      const loaded = await ctx.runQuery(internal.documents.loadDocumentWithPages, {
        documentId: resolvedDocId,
      });
      if (loaded) {
        documentName = loaded.document.name;
        documentType = loaded.document.type;
        pages = loaded.pages.map((p) => ({ index: p.index, content: p.content }));
      }
    }

    const pagesBlock =
      pages.length > 0
        ? pages
            .map((p) => `--- [p.${p.index}] ---\n${truncate(p.content, MAX_PAGE_CHARS)}`)
            .join("\n\n")
        : "(no source document pages attached)";

    const systemPrompt =
      "You are assisting a family wealth advisor. Produce a redline in Markdown that shows BEFORE/AFTER " +
      "passages. Use `~~strikethrough~~` for removals and `**bold**` for additions. Cite source pages " +
      "inline in the exact form `[p.<n>]` where <n> is the page index shown in the source. At the end, " +
      "include a short section titled `### Route to` naming the professional who should review this " +
      "(one of: attorney, accountant, estate planner, trust officer) and a one-sentence rationale.";

    const docLine = documentName
      ? `The relevant document is '${documentName}' (type: ${documentType}).`
      : "No document is attached to this signal.";

    const userPrompt = [
      `A signal has been raised for this family: '${signal.title}' — ${signal.reason}.`,
      `Suggested action: ${signal.suggested_action ?? "n/a"}.`,
      docLine,
      instructions ? `Additional instructions: ${instructions}` : "",
      "",
      "Source pages:",
      "",
      pagesBlock,
    ]
      .filter(Boolean)
      .join("\n");

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

    let redlineMarkdown = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) redlineMarkdown += delta;
    }

    const citations = extractCitations(redlineMarkdown, pages);
    const targetProfessionalHint = extractProfessionalHint(redlineMarkdown);

    await ctx.runMutation(api.signals.updateStatus, { signalId, status: "drafting" });

    return {
      success: true,
      widget: {
        kind: "draft-revision",
        props: {
          signalId,
          signalTitle: signal.title,
          documentId: resolvedDocId ?? null,
          redlineMarkdown,
          targetProfessionalHint,
          citations,
        },
      },
    };
  },
});
