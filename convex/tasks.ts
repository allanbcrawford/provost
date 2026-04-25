import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { filterByAccess, grantParty, requireResourceWrite } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";
import { checkAndIncrement } from "./lib/rateLimit";

const assigneeTypeValidator = v.union(
  v.literal("planner"),
  v.literal("professional"),
  v.literal("member"),
);

const statusValidator = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const create = mutation({
  args: {
    familyId: v.id("families"),
    assigneeType: assigneeTypeValidator,
    title: v.string(),
    body: v.string(),
    assigneeId: v.optional(v.string()),
    sourceSignalId: v.optional(v.id("signals")),
  },
  handler: async (ctx, args) => {
    await requireFamilyMember(ctx, args.familyId);
    const user = await requireUserRecord(ctx);
    await checkAndIncrement(ctx, "tool.create_task:family", args.familyId);
    const taskId = await ctx.db.insert("tasks", {
      family_id: args.familyId,
      created_by: user._id,
      assignee_type: args.assigneeType,
      assignee_id: args.assigneeId,
      title: args.title,
      body: args.body,
      status: "open",
      source_signal_id: args.sourceSignalId,
    });
    await grantParty(ctx, {
      familyId: args.familyId,
      resourceType: "task",
      resourceId: taskId,
      userId: user._id,
      role: "owner",
      grantedBy: user._id,
    });
    if (args.assigneeType === "member" && args.assigneeId) {
      await grantParty(ctx, {
        familyId: args.familyId,
        resourceType: "task",
        resourceId: taskId,
        userId: args.assigneeId as Id<"users">,
        role: "party",
        grantedBy: user._id,
      });
    }
    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "tasks.create",
      resourceType: "tasks",
      resourceId: taskId,
      metadata: {
        assigneeType: args.assigneeType,
        sourceSignalId: args.sourceSignalId ?? null,
      },
    });
    return taskId;
  },
});

export const list = query({
  args: {
    familyId: v.id("families"),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { familyId, status }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = status
      ? await ctx.db
          .query("tasks")
          .withIndex("by_family_and_status", (q) =>
            q.eq("family_id", familyId).eq("status", status),
          )
          .collect()
      : await ctx.db
          .query("tasks")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
    return await filterByAccess(ctx, "task", rows, membership);
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: statusValidator,
  },
  handler: async (ctx, { taskId, status }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return null;
    const { user } = await requireResourceWrite(ctx, "task", task, taskId);
    await ctx.db.patch(taskId, { status });
    await writeAudit(ctx, {
      familyId: task.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "tasks.update_status",
      resourceType: "tasks",
      resourceId: taskId,
      metadata: { status, previousStatus: task.status },
    });
    return null;
  },
});
