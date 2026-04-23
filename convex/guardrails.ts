"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { getOpenAI } from "./agent/openai";

export type GuardCategory = "safe" | "non_advice" | "pii_detected";

export type GuardResult = {
  category: GuardCategory;
  reason?: string;
  disclaimer?: string | null;
  redactedText?: string | null;
};

const CLASSIFIER_PROMPT = `Classify the user message. Respond with JSON only:
{ "category": "safe" | "non_advice" | "pii_detected",
  "reason": string,
  "disclaimer": string | null,
  "redactedText": string | null }

Rules:
- non_advice: the message asks for specific legal, tax, or investment advice that a licensed professional must provide. Set "disclaimer" to a brief note reminding the user that Provost provides educational information, not licensed professional advice, and suggest consulting a qualified professional.
- pii_detected: the message contains sensitive personal identifiers — SSN, bank/routing account numbers, credit/debit card numbers, government IDs, or similar. Set "redactedText" to the original message with every such identifier replaced by "[REDACTED]".
- safe: anything else. Set "disclaimer" and "redactedText" to null.

Return ONLY JSON, no prose.`;

export const classifyMessage = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, { text }): Promise<GuardResult> => {
    const openai = getOpenAI();
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: text },
        ],
      });
      const content = res.choices[0]?.message?.content ?? '{"category":"safe"}';
      const parsed = JSON.parse(content) as GuardResult;
      if (
        parsed.category !== "safe" &&
        parsed.category !== "non_advice" &&
        parsed.category !== "pii_detected"
      ) {
        return { category: "safe" };
      }
      return parsed;
    } catch {
      return { category: "safe" };
    }
  },
});
