import { defineTable } from "convex/server";
import { v } from "convex/values";

export const eventTables = {
  events: defineTable({
    family_id: v.id("families"),
    created_by: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    starts_at: v.number(),
    ends_at: v.number(),
    location_type: v.union(v.literal("in_person"), v.literal("video")),
    location_detail: v.optional(v.string()),
    agenda: v.optional(v.string()),
    recap: v.optional(v.string()),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_family_and_starts_at", ["family_id", "starts_at"]),

  event_attendees: defineTable({
    event_id: v.id("events"),
    user_id: v.id("users"),
    rsvp_status: v.union(
      v.literal("pending"),
      v.literal("yes"),
      v.literal("no"),
      v.literal("maybe"),
    ),
    notified_at: v.optional(v.number()),
  })
    .index("by_event", ["event_id"])
    .index("by_user", ["user_id"])
    .index("by_event_and_user", ["event_id", "user_id"]),
};
