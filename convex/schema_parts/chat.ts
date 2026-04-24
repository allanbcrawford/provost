import { defineTable } from "convex/server";
import { v } from "convex/values";

export const chatTables = {
  threads: defineTable({
    family_id: v.id("families"),
    creator_id: v.optional(v.id("users")),
    title: v.optional(v.string()),
    current_run_id: v.optional(v.id("thread_runs")),
    messages: v.array(v.any()),
    // Rolling summary of older messages. Populated by the nightly
    // summarization cron when a thread's message count exceeds the trim
    // threshold. The run loop uses summary + tail in place of full history.
    summary: v.optional(v.string()),
    summarized_up_to_index: v.optional(v.number()),
    summarized_at: v.optional(v.number()),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_creator", ["creator_id"]),

  thread_users: defineTable({
    thread_id: v.id("threads"),
    user_id: v.id("users"),
  })
    .index("by_thread_and_user", ["thread_id", "user_id"])
    .index("by_user", ["user_id"]),

  thread_runs: defineTable({
    thread_id: v.id("threads"),
    user_id: v.id("users"),
    family_id: v.id("families"),
    history: v.array(v.any()),
    state: v.object({
      pending_tool_calls: v.array(v.any()),
    }),
    tools: v.array(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("waiting_for_approval"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    route: v.optional(v.string()),
    selection: v.optional(v.union(v.null(), v.object({ kind: v.string(), id: v.string() }))),
    visible_state: v.optional(v.any()),
    started_at: v.number(),
    finished_at: v.optional(v.number()),
  })
    .index("by_thread", ["thread_id"])
    .index("by_user", ["user_id"])
    .index("by_family", ["family_id"]),

  thread_run_attachments: defineTable({
    thread_run_id: v.id("thread_runs"),
    file_id: v.id("files"),
  }).index("by_run_and_file", ["thread_run_id", "file_id"]),

  run_events: defineTable({
    thread_run_id: v.id("thread_runs"),
    thread_id: v.id("threads"),
    sequence: v.number(),
    type: v.union(
      v.literal("run_started"),
      v.literal("run_paused"),
      v.literal("run_resumed"),
      v.literal("run_finished"),
      v.literal("run_error"),
      v.literal("step_started"),
      v.literal("step_finished"),
      v.literal("message_started"),
      v.literal("message_finished"),
      v.literal("content_started"),
      v.literal("content_delta"),
      v.literal("content_finished"),
      v.literal("tool_call_started"),
      v.literal("tool_call_delta"),
      v.literal("tool_call_finished"),
      v.literal("tool_call_approved"),
      v.literal("tool_call_rejected"),
    ),
    data: v.any(),
  }).index("by_thread_run_and_sequence", ["thread_run_id", "sequence"]),
};
