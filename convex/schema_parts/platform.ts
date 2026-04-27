import { defineTable } from "convex/server";
import { v } from "convex/values";

export const platformTables = {
  signals: defineTable({
    family_id: v.id("families"),
    severity: v.union(v.literal("missing"), v.literal("review"), v.literal("stale")),
    category: v.union(
      v.literal("missing"),
      v.literal("conflict"),
      v.literal("risk"),
      v.literal("recommendation"),
    ),
    title: v.string(),
    reason: v.string(),
    suggested_action: v.optional(v.string()),
    member_ids: v.array(v.id("users")),
    related_document_id: v.optional(v.id("documents")),
    suggested_professional_id: v.optional(v.id("professionals")),
    status: v.union(
      v.literal("open"),
      v.literal("drafting"),
      v.literal("sent_to_planner"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    source: v.union(v.literal("rule"), v.literal("llm"), v.literal("manual")),
    rule_key: v.optional(v.string()),
    // Review workflow gate. Optional during widen phase. New LLM-sourced
    // signals default to "pending_review"; rule + manual signals stay
    // visible to family members immediately. Backfill defaults all
    // existing rows to "approved" to preserve current behavior.
    review_status: v.optional(
      v.union(v.literal("pending_review"), v.literal("approved"), v.literal("dismissed")),
    ),
  })
    .index("by_family", ["family_id"])
    .index("by_family_and_status", ["family_id", "status"])
    .index("by_family_and_severity", ["family_id", "severity"]),

  tasks: defineTable({
    family_id: v.id("families"),
    created_by: v.id("users"),
    assignee_type: v.union(v.literal("planner"), v.literal("professional"), v.literal("member")),
    assignee_id: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    due_date: v.optional(v.number()),
    source_signal_id: v.optional(v.id("signals")),
  })
    .index("by_family", ["family_id"])
    .index("by_family_and_status", ["family_id", "status"]),

  audit_events: defineTable({
    family_id: v.optional(v.id("families")),
    actor_user_id: v.optional(v.id("users")),
    actor_kind: v.union(v.literal("user"), v.literal("system"), v.literal("agent")),
    category: v.union(
      v.literal("mutation"),
      v.literal("tool_call"),
      v.literal("run"),
      v.literal("auth"),
      v.literal("approval"),
    ),
    action: v.string(),
    resource_type: v.optional(v.string()),
    resource_id: v.optional(v.string()),
    metadata: v.any(),
  })
    .index("by_family", ["family_id"])
    .index("by_family_and_category", ["family_id", "category"])
    .index("by_actor_user", ["actor_user_id"]),

  tool_call_approvals: defineTable({
    thread_run_id: v.id("thread_runs"),
    tool_call_id: v.string(),
    tool_name: v.string(),
    arguments: v.any(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requested_by: v.id("users"),
    decided_by: v.optional(v.id("users")),
    decided_at: v.optional(v.number()),
    decision_reason: v.optional(v.string()),
    // User-supplied tool-call result (e.g. a form widget submission). If set,
    // the resume loop uses this instead of invoking the tool handler. Matches
    // the FastAPI submit-tool-call flow.
    submitted_result: v.optional(v.any()),
  })
    .index("by_run", ["thread_run_id"])
    .index("by_status", ["status"])
    .index("by_tool_call_id", ["tool_call_id"]),

  rate_limits: defineTable({
    key: v.string(),
    window_start: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  family_preferences: defineTable({
    family_id: v.id("families"),
    key: v.string(),
    value: v.any(),
  }).index("by_family_and_key", ["family_id", "key"]),

  family_memories: defineTable({
    family_id: v.id("families"),
    text: v.string(),
    source_run_id: v.optional(v.id("thread_runs")),
    created_by_user_id: v.optional(v.id("users")),
  }).index("by_family", ["family_id"]),

  // Page-contextual prompt suggestions cache. Keyed by (family_id, route,
  // selection_signature). Refilled lazily by an action when the cached entry
  // is missing or older than the TTL.
  prompt_suggestions_cache: defineTable({
    family_id: v.id("families"),
    cache_key: v.string(),
    prompts: v.array(v.string()),
    generated_at: v.number(),
  })
    .index("by_family_and_key", ["family_id", "cache_key"])
    .index("by_generated_at", ["generated_at"]),

  // Feature flags. Site-admin toggles drive whether a UI surface renders
  // its content or shows a "Launching soon" overlay. `family_overrides`
  // lets demo families bypass an otherwise-disabled flag.
  feature_flags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    family_overrides: v.array(v.id("families")),
    description: v.optional(v.string()),
  }).index("by_key", ["key"]),
};
