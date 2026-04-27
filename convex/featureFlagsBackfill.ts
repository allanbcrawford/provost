// Seed initial feature flags. Idempotent — only inserts when the key is
// missing. Adopting the gate without flipping live features off, so all
// defaults are enabled=true.
//
//   npx convex run featureFlagsBackfill:seedDefaults

import { internalMutation } from "./_generated/server";

const DEFAULTS: Array<{ key: string; enabled: boolean; description: string }> = [
  { key: "messages", enabled: true, description: "Family messaging surface." },
  { key: "events", enabled: true, description: "Family events surface." },
  { key: "assets_history", enabled: true, description: "Assets trend chart." },
  { key: "signals_queue", enabled: true, description: "Advisor review queue for AI signals." },
  { key: "lesson_editor", enabled: true, description: "Site-admin lesson editor." },
  // Genuine placeholders — disabled until the surface ships.
  { key: "settings", enabled: false, description: "Family settings + integrations surface." },
  { key: "legacy", enabled: false, description: "Family legacy / values / history surface." },
];

export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const def of DEFAULTS) {
      const existing = await ctx.db
        .query("feature_flags")
        .withIndex("by_key", (q) => q.eq("key", def.key))
        .unique();
      if (existing) continue;
      await ctx.db.insert("feature_flags", {
        key: def.key,
        enabled: def.enabled,
        family_overrides: [],
        description: def.description,
      });
      inserted++;
    }
    return { total: DEFAULTS.length, inserted };
  },
});
