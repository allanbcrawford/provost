import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coreTables = {
  users: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    middle_name: v.optional(v.string()),
    email: v.string(),
    phone_number: v.optional(v.string()),
    date_of_birth: v.optional(v.string()),
    home_location: v.optional(v.string()),
    education: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    generation: v.number(),
    father_id: v.optional(v.id("users")),
    mother_id: v.optional(v.id("users")),
    spouse_id: v.optional(v.id("users")),
    clerk_user_id: v.string(),
    learning_path: v.optional(v.string()),
    onboarding_status: v.string(),
    // Stewardship phase drives program selection in the learning system. Set
    // by advisor at onboarding; editable by admins/advisors. Optional during
    // migration window; new onboarding flows must set it.
    stewardship_phase: v.optional(
      v.union(
        v.literal("emerging"),
        v.literal("developing"),
        v.literal("operating"),
        v.literal("enduring"),
      ),
    ),
    // Site-admin flag (distinct from per-family family_users.role). Site
    // admins see the /(admin) UI for Library curation and Governance; they
    // have no family context by default.
    is_site_admin: v.optional(v.boolean()),
    deleted_at: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerk_user_id"])
    .index("by_site_admin", ["is_site_admin"]),

  families: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    created_by: v.id("users"),
    deleted_at: v.optional(v.number()),
  }).index("by_created_by", ["created_by"]),

  family_users: defineTable({
    family_id: v.id("families"),
    user_id: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("advisor"),
      v.literal("trustee"),
    ),
    // Optional employment label for the family's "Internal" Professionals tab
    // (e.g. "CFO", "Family Office Director", "Bookkeeper"). When set, this
    // member is treated as on the family's payroll/team and surfaces in the
    // Internal directory.
    employment_role: v.optional(v.string()),
  })
    .index("by_family", ["family_id"])
    .index("by_user", ["user_id"])
    .index("by_family_and_user", ["family_id", "user_id"]),

  files: defineTable({
    user_id: v.id("users"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    hash: v.string(),
    storage_id: v.id("_storage"),
  }).index("by_user", ["user_id"]),

  documents: defineTable({
    family_id: v.id("families"),
    file_id: v.optional(v.id("files")),
    knowledge_graph_id: v.optional(v.id("knowledge_graphs")),
    name: v.string(),
    description: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.string(),
    type: v.string(),
    creator_name: v.optional(v.string()),
    observation_type: v.union(v.literal("observation"), v.literal("danger")),
    observation_is_observed: v.boolean(),
    embedding: v.optional(v.array(v.float64())),
    // Lightweight version chain (P3.3). When this row is a newer version of an
    // existing document, parent_document_id points to the original (which
    // itself stays the canonical "v1"). version_date is the document's
    // effective date, used to sort versions in the UI dropdown.
    parent_document_id: v.optional(v.id("documents")),
    version_date: v.optional(v.number()),
    // Document-typed structured state. For will/trust types this holds a
    // WaterfallState (see convex/lib/waterfallState.ts) used by the
    // inheritance engine. Stored as v.any() because the shape varies per
    // document type and is validated at write time via zod.
    state: v.optional(v.any()),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_category", ["category"])
    .index("by_parent", ["parent_document_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["family_id"],
    }),

  pages: defineTable({
    document_id: v.id("documents"),
    index: v.number(),
    content: v.string(),
  }).index("by_document_and_index", ["document_id", "index"]),
};
