import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireUserRecord } from "./lib/authz";

export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserRecord(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    hash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserRecord(ctx);
    const fileId = await ctx.db.insert("files", {
      user_id: user._id,
      name: args.name,
      type: args.type,
      size: args.size,
      hash: args.hash ?? "",
      storage_id: args.storageId,
    });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "file.create",
      resourceType: "files",
      resourceId: fileId,
      metadata: { name: args.name, type: args.type, size: args.size },
    });

    return { fileId };
  },
});
