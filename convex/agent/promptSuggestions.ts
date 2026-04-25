"use node";

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { type ActionCtx, action } from "../_generated/server";
import { getOpenAI } from "./openai";

const TTL_MS = 60 * 60 * 1000; // 1 hour

const ROUTE_BLURBS: Record<string, string> = {
  "/": "Provost home page — bento dashboard summarising the family.",
  "/family": "Family page — graph of members, professionals, and their connections.",
  "/documents": "Documents page — estate, tax, legal, financial agreements.",
  "/lessons": "Lessons page — personalized learning across stewardship phases.",
  "/library": "Library page — knowledge base of curated wealth-planning content.",
  "/signals": "Signals inbox — AI-flagged observations and risks.",
  "/simulations": "Simulations — inheritance waterfall scenarios.",
  "/governance": "Governance — audit log, approvals, tasks.",
  "/professionals": "Professionals directory — advisors, attorneys, accountants.",
  "/messages": "Messages — conversations with family members and professionals.",
  "/events": "Events — family calendar and planning sessions.",
  "/assets": "Assets — consolidated family asset inventory.",
};

function blurbForRoute(route: string): string {
  // Match the most specific known prefix.
  const candidates = Object.keys(ROUTE_BLURBS)
    .filter((k) => route === k || route.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length);
  return ROUTE_BLURBS[candidates[0] ?? "/"] ?? "Generic family-office workspace.";
}

function makeCacheKey(route: string, selection: string | null): string {
  return `${route}::${selection ?? ""}`;
}

async function generateSuggestions(
  _ctx: ActionCtx,
  args: { familyId: string; route: string; selection: string | null },
): Promise<string[]> {
  const openai = getOpenAI();
  const blurb = blurbForRoute(args.route);
  const selectionLine = args.selection
    ? `The user is currently focused on: ${args.selection}.`
    : "The user has not selected anything specific.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content:
          "You write short, page-contextual prompt suggestions for an AI assistant " +
          "that helps multi-generational families with their wealth and stewardship. " +
          "Return EXACTLY 4 prompts. Each prompt is a single line, no bullets, no " +
          "numbering, under 90 characters, written as the user would type them, " +
          "starting with a verb. No quotes, no preamble.",
      },
      {
        role: "user",
        content: `${blurb}\n${selectionLine}\n\nReturn 4 prompts the user might want to send.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^([-*•]|\d+[.)])\s+/, "").trim())
    .filter((line) => line.length > 0 && line.length <= 120)
    .slice(0, 5);
}

// Public action: returns prompts for (route, selection). Reads cache via the
// internal query; if cache is cold or stale, generates fresh prompts and
// writes them. Idempotent within the TTL window.
//
// Fail-soft: if OpenAI is rate-limited or otherwise erroring, we return an
// empty list (so the chip row stays hidden) rather than throwing. This is a
// non-critical UX feature — never let it break the chat input.
export const ensure = action({
  args: {
    familyId: v.id("families"),
    route: v.string(),
    selection: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const selection = args.selection ?? null;
    const cacheKey = makeCacheKey(args.route, selection);
    const cached = await ctx.runQuery(api.promptSuggestionsRead.read, {
      familyId: args.familyId,
      cacheKey,
    });
    if (cached && Date.now() - cached.generated_at < TTL_MS) {
      return cached.prompts;
    }

    let prompts: string[] = [];
    try {
      prompts = await generateSuggestions(ctx, {
        familyId: args.familyId,
        route: args.route,
        selection,
      });
    } catch (err) {
      console.warn(
        "[promptSuggestions.ensure] generation failed, returning empty list:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }

    await ctx.runMutation(internal.promptSuggestionsRead.upsert, {
      familyId: args.familyId,
      cacheKey,
      prompts,
    });
    return prompts;
  },
});
