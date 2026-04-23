"use node";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { getOpenAI } from "../openai";

function parseBullets(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const stripped = trimmed.replace(/^([-*•]|\d+[.)])\s+/, "").trim();
    if (stripped) bullets.push(stripped);
  }
  return bullets.slice(0, 5);
}

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args }) => {
    const lessonId = args?.lessonId as Id<"lessons">;
    const audience = (args?.audience as string | undefined) ?? "self";

    const lesson = await ctx.runQuery(api.lessons.get, { lessonId });

    const source = [
      `Title: ${lesson.title}`,
      lesson.description ? `Description: ${lesson.description}` : "",
      lesson.category ? `Category: ${lesson.category}` : "",
      lesson.content ? `Content: ${JSON.stringify(lesson.content)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You summarize wealth-planning lessons into concise, actionable bullet points. Return only the bullets, one per line, no preamble.",
        },
        {
          role: "user",
          content: `Summarize this lesson for a ${audience}. Return 3–5 bullet points.\n\n${source}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const summary = parseBullets(text);

    return {
      success: true,
      widget: {
        kind: "lesson-summary",
        props: { lessonId, summary },
      },
    };
  },
});
