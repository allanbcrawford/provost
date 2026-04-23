import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserRecord } from "./lib/authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserRecord(ctx);
    return await ctx.db.query("professionals").collect();
  },
});

export const get = query({
  args: { professionalId: v.id("professionals") },
  handler: async (ctx, { professionalId }) => {
    await requireUserRecord(ctx);
    return await ctx.db.get(professionalId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    profession: v.string(),
    firm: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUserRecord(ctx);
    if (user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN_ROLE", required: ["admin"] });
    }
    return await ctx.db.insert("professionals", args);
  },
});
