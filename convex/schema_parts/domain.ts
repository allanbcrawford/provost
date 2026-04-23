import { defineTable } from "convex/server";
import { v } from "convex/values";

export const domainTables = {
  lessons: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    content: v.any(),
    embedding: v.optional(v.array(v.float64())),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["family_id"],
    }),

  lesson_users: defineTable({
    lesson_id: v.id("lessons"),
    user_id: v.id("users"),
    approved_by: v.optional(v.id("users")),
    due_date: v.optional(v.number()),
    status: v.union(
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("overdue"),
    ),
    slide_index: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_lesson", ["lesson_id"]),

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
    name: v.string(),
    profession: v.string(),
    firm: v.string(),
    email: v.string(),
  }).index("by_profession", ["profession"]),

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
