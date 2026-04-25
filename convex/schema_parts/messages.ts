import { defineTable } from "convex/server";
import { v } from "convex/values";

// DMs and threaded conversations between family members and professionals.
// Per ACL policy: messages are the one resource type where family admins do
// NOT bypass the party check (DMs stay private even from admins). This is
// enforced in convex/lib/acl.ts:BYPASS_BY_TYPE.message = false.

export const messageTables = {
  message_threads: defineTable({
    family_id: v.id("families"),
    subject: v.optional(v.string()),
    // Denormalised participant list; the authoritative ACL is in
    // resource_parties (resource_type: "message" → applied per message; threads
    // inherit visibility from their messages and participant set).
    participant_user_ids: v.array(v.id("users")),
    last_message_at: v.number(),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_last_message_at", ["last_message_at"]),

  messages: defineTable({
    thread_id: v.id("message_threads"),
    family_id: v.id("families"),
    sender_user_id: v.id("users"),
    body: v.string(),
    sent_at: v.number(),
    deleted_at: v.optional(v.number()),
  })
    .index("by_thread", ["thread_id"])
    .index("by_thread_and_sent_at", ["thread_id", "sent_at"]),

  message_reads: defineTable({
    message_id: v.id("messages"),
    user_id: v.id("users"),
    read_at: v.number(),
  })
    .index("by_user_and_message", ["user_id", "message_id"])
    .index("by_message", ["message_id"]),

  // Per-user draft. Either edits an existing thread or starts a new DM with
  // recipient_user_ids[]. One draft per (user, thread) or (user, recipient set)
  // — the client decides which.
  message_drafts: defineTable({
    user_id: v.id("users"),
    family_id: v.id("families"),
    thread_id: v.optional(v.id("message_threads")),
    recipient_user_ids: v.array(v.id("users")),
    body: v.string(),
    updated_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_and_thread", ["user_id", "thread_id"]),
};
