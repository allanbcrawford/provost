"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getOpenAI } from "./openai";

// If a thread has more than TRIM_THRESHOLD messages, we summarize everything
// older than `messages.length - TAIL_KEEP` into the rolling `threads.summary`.
// The run loop then sends summary + tail instead of the full history.
export const TRIM_THRESHOLD = 40;
export const TAIL_KEEP = 20;
const STALENESS_MS = 24 * 60 * 60 * 1000; // only re-summarize threads touched in the last 24h

type ChatMessage = { role?: string; content?: unknown; tool_call_id?: string };

function renderMessage(m: ChatMessage): string {
  const role = m.role ?? "?";
  const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
  if (!content.trim()) return "";
  return `[${role}] ${content.slice(0, 800)}`;
}

export const summarizeThread = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }): Promise<{ summarized: boolean; upTo: number } | null> => {
    const thread = await ctx.runQuery(internal.agent.summarizeInternal.loadThread, { threadId });
    if (!thread) return null;

    const messages = (thread.messages ?? []) as ChatMessage[];
    if (messages.length <= TRIM_THRESHOLD) return { summarized: false, upTo: 0 };

    const cutoff = messages.length - TAIL_KEEP;
    // Already summarized up to this point (or beyond) — skip.
    if (thread.summarized_up_to_index && thread.summarized_up_to_index >= cutoff) {
      return { summarized: false, upTo: thread.summarized_up_to_index };
    }

    const toSummarize = messages.slice(0, cutoff);
    const rendered = toSummarize
      .map(renderMessage)
      .filter((s) => s.length > 0)
      .join("\n");

    const previous = thread.summary ? `\n\nPrevious summary:\n${thread.summary}` : "";
    const prompt = `You are summarizing an ongoing Provost chat thread for a family-wealth-advisor AI. Condense the exchange below into a compact brief (~180 words) capturing: who is participating, what topics were covered, any decisions or commitments, and open threads. Preserve names and concrete values. Do not editorialize.${previous}\n\nMessages:\n${rendered}`;

    const openai = getOpenAI();
    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You produce terse, factual conversation summaries." },
        { role: "user", content: prompt },
      ],
    });
    const summary = res.choices[0]?.message?.content?.trim() ?? "";
    if (!summary) return { summarized: false, upTo: thread.summarized_up_to_index ?? 0 };

    await ctx.runMutation(internal.agent.summarizeInternal.writeSummary, {
      threadId,
      summary,
      upToIndex: cutoff,
    });

    return { summarized: true, upTo: cutoff };
  },
});

/**
 * Nightly cron entrypoint. Finds threads updated in the last 24h with more
 * than TRIM_THRESHOLD messages and summarizes each.
 */
export const nightlyThreadSummary = internalAction({
  args: {},
  handler: async (ctx): Promise<{ considered: number; summarized: number }> => {
    const since = Date.now() - STALENESS_MS;
    const ids: string[] = await ctx.runQuery(internal.agent.summarizeInternal.listSummarizable, {
      since,
      minMessages: TRIM_THRESHOLD,
    });
    let summarized = 0;
    for (const id of ids) {
      const result = await ctx.runAction(internal.agent.summarize.summarizeThread, {
        threadId: id as never,
      });
      if (result?.summarized) summarized++;
    }
    return { considered: ids.length, summarized };
  },
});
