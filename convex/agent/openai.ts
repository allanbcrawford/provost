import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set on this Convex deployment. " +
          "Run `npx convex env set OPENAI_API_KEY <key>` to configure it.",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}
