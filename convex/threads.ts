import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) return null;
    await requireFamilyMember(ctx, thread.family_id);
    return thread;
  },
});
