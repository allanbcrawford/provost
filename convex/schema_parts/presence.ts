import { defineTable } from "convex/server";
import { v } from "convex/values";

// Issue 6.5 — Active users presence.
// High-churn operational table: every user heartbeats every ~30s while a tab
// is open. Kept on its own table (not on `users`) per Convex guidelines so
// frequent writes don't contend with stable profile reads.
//
// "Active" is computed at read time as `last_seen_at >= now - 60s`. There is
// no stale-row cleanup cron in V1 — stale rows simply filter out of
// `listActive`. A future cron could prune rows older than ~24h if growth
// becomes a concern.
export const presenceTables = {
  presence: defineTable({
    user_id: v.id("users"),
    last_seen_at: v.number(),
    family_id: v.optional(v.id("families")),
    surface: v.optional(v.string()),
  })
    .index("by_user", ["user_id"])
    .index("by_family_lastSeen", ["family_id", "last_seen_at"]),
};
