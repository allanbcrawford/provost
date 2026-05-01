// Issue 6.2 — Family History timeline.
//
// Append-only log of semantically interesting events on a family (members
// added, documents executed, observations resolved, calendar events held,
// manual entries). Drives the History tab on the Family page.
//
// `occurred_at` is the *semantic* event time (e.g. when a document was signed
// or a member joined), not the row's creation time — backfill rows reach back
// in time and so cannot rely on `_creationTime` for ordering.

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const familyHistoryTables = {
  family_history_events: defineTable({
    family_id: v.id("families"),
    kind: v.union(
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("document_executed"),
      v.literal("observation_resolved"),
      v.literal("event_held"),
      v.literal("manual"),
    ),
    title: v.string(),
    description: v.optional(v.string()),
    occurred_at: v.number(),
    actor_user_id: v.optional(v.id("users")),
    related_entity_type: v.optional(v.string()),
    related_entity_id: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_family", ["family_id"])
    .index("by_family_occurred", ["family_id", "occurred_at"]),
};
