import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

export const listSaved = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    return await ctx.db
      .query("waterfalls")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
  },
});

export const save = mutation({
  args: { familyId: v.id("families"), name: v.string(), state: v.any() },
  handler: async (ctx, { familyId, name, state }) => {
    await requireFamilyMember(ctx, familyId);
    return await ctx.db.insert("waterfalls", { family_id: familyId, name, state });
  },
});

export const remove = mutation({
  args: { simulationId: v.id("waterfalls") },
  handler: async (ctx, { simulationId }) => {
    const row = await ctx.db.get(simulationId);
    if (!row) return;
    await requireFamilyMember(ctx, row.family_id, ["admin"]);
    await ctx.db.delete(simulationId);
  },
});
