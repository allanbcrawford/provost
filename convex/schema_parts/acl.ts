import { defineTable } from "convex/server";
import { v } from "convex/values";

export const RESOURCE_TYPES = [
  "document",
  "observation",
  "signal",
  "task",
  "waterfall",
  "asset",
  "memory",
  "message",
  "event",
  "lesson",
] as const;

export const resourceTypeValidator = v.union(
  v.literal("document"),
  v.literal("observation"),
  v.literal("signal"),
  v.literal("task"),
  v.literal("waterfall"),
  v.literal("asset"),
  v.literal("memory"),
  v.literal("message"),
  v.literal("event"),
  v.literal("lesson"),
);

export const partyRoleValidator = v.union(
  v.literal("owner"),
  v.literal("party"),
  v.literal("viewer"),
);

export const aclTables = {
  resource_parties: defineTable({
    family_id: v.id("families"),
    resource_type: resourceTypeValidator,
    resource_id: v.string(),
    user_id: v.id("users"),
    role: partyRoleValidator,
    granted_by: v.id("users"),
    granted_at: v.number(),
  })
    .index("by_resource", ["resource_type", "resource_id"])
    .index("by_user_and_type", ["user_id", "resource_type"])
    .index("by_family_and_user", ["family_id", "user_id"]),
};
