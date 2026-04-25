// Read/write helpers for the prompt-suggestions cache. Split from
// agent/promptSuggestions.ts because the action runs in Node ("use node")
// and can't host queries/mutations directly.

import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

// Public-facing query. Returns the cached entry (or null). The action layer
// is what actually generates prompts; the UI reads via this query and may
// trigger the action separately.
export const read = query({
  args: { familyId: v.id("families"), cacheKey: v.string() },
  handler: async (ctx, { familyId, cacheKey }) => {
    await requireFamilyMember(ctx, familyId);
    const row = await ctx.db
      .query("prompt_suggestions_cache")
      .withIndex("by_family_and_key", (q) => q.eq("family_id", familyId).eq("cache_key", cacheKey))
      .unique();
    if (!row) return null;
    return { prompts: row.prompts, generated_at: row.generated_at };
  },
});

export const upsert = internalMutation({
  args: {
    familyId: v.id("families"),
    cacheKey: v.string(),
    prompts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("prompt_suggestions_cache")
      .withIndex("by_family_and_key", (q) =>
        q.eq("family_id", args.familyId).eq("cache_key", args.cacheKey),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        prompts: args.prompts,
        generated_at: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("prompt_suggestions_cache", {
      family_id: args.familyId,
      cache_key: args.cacheKey,
      prompts: args.prompts,
      generated_at: Date.now(),
    });
  },
});
