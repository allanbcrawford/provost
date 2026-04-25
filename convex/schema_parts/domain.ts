import { defineTable } from "convex/server";
import { v } from "convex/values";
import { learningStatusValidator } from "./learning";

export const domainTables = {
  lessons: defineTable({
    family_id: v.id("families"),
    // Programs/Tracks hierarchy added by P0b. Optional during migration window;
    // post-migration every lesson belongs to a track.
    track_id: v.optional(v.id("tracks")),
    sort_order: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    // Legacy slideshow blob. New lessons should set article_markdown instead;
    // the reader switches on `format`.
    content: v.any(),
    // P0b reader-rewrite (#23). When format is "article", article_markdown
    // is the canonical body and content is ignored. "slides" is the legacy
    // path. Lessons missing format are treated as slides.
    format: v.optional(v.union(v.literal("article"), v.literal("slides"))),
    article_markdown: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_track", ["track_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["family_id"],
    }),

  lesson_users: defineTable({
    lesson_id: v.id("lessons"),
    user_id: v.id("users"),
    family_id: v.optional(v.id("families")),
    approved_by: v.optional(v.id("users")),
    // due_date kept for backward compat during migration; new writes must omit
    // (PRD explicitly forbids "due date" framing).
    due_date: v.optional(v.number()),
    status: learningStatusValidator,
    slide_index: v.number(),
    quiz_passed_at: v.optional(v.number()),
  })
    .index("by_user", ["user_id"])
    .index("by_lesson", ["lesson_id"])
    .index("by_user_and_lesson", ["user_id", "lesson_id"]),

  knowledge_graphs: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    deleted_at: v.optional(v.number()),
  }).index("by_family", ["family_id"]),

  nodes: defineTable({
    knowledge_graph_id: v.id("knowledge_graphs"),
    node_id: v.string(),
    type: v.string(),
    properties: v.any(),
  }).index("by_kg_and_nodeid", ["knowledge_graph_id", "node_id"]),

  edges: defineTable({
    knowledge_graph_id: v.id("knowledge_graphs"),
    source_node_id: v.string(),
    target_node_id: v.string(),
    edge_type: v.string(),
    properties: v.any(),
  }).index("by_kg", ["knowledge_graph_id"]),

  observations: defineTable({
    family_id: v.id("families"),
    document_id: v.optional(v.id("documents")),
    title: v.string(),
    description: v.string(),
    why_this_matters: v.string(),
    recommendation: v.string(),
    next_best_actions: v.array(v.string()),
    suggested_prompts: v.array(v.string()),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("done")),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_document", ["document_id"]),

  waterfalls: defineTable({
    family_id: v.id("families"),
    name: v.string(),
    state: v.any(),
  }).index("by_family", ["family_id"]),

  fun_facts: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    body: v.string(),
    category: v.string(),
  }).index("by_family", ["family_id"]),

  historical_data: defineTable({
    family_id: v.id("families"),
    label: v.string(),
    year: v.number(),
    value: v.number(),
    unit: v.string(),
  }).index("by_family", ["family_id"]),

  financials: defineTable({
    family_id: v.id("families"),
    name: v.string(),
    value: v.number(),
    currency: v.string(),
    as_of_date: v.string(),
    source: v.string(),
  }).index("by_family", ["family_id"]),

  professionals: defineTable({
    // family_id is optional during the migration window — once backfill has
    // assigned every professional to a family, this becomes effectively
    // required and queries reject rows that haven't been migrated.
    family_id: v.optional(v.id("families")),
    name: v.string(),
    profession: v.string(),
    firm: v.string(),
    email: v.string(),
  })
    .index("by_family", ["family_id"])
    .index("by_profession", ["profession"]),

  assets: defineTable({
    family_id: v.id("families"),
    name: v.string(),
    type: v.string(),
    value: v.number(),
    currency: v.string(),
    as_of_date: v.string(),
  }).index("by_family", ["family_id"]),

  library_sources: defineTable({
    family_id: v.optional(v.id("families")),
    title: v.string(),
    author: v.optional(v.string()),
    category: v.string(),
    content: v.string(),
    tags: v.any(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_family", ["family_id"])
    .index("by_category", ["category"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["family_id"],
    }),

  library_groups: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    source_ids: v.array(v.id("library_sources")),
  }).index("by_family", ["family_id"]),

  library_collections: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    group_ids: v.array(v.id("library_groups")),
  }).index("by_family", ["family_id"]),
};
