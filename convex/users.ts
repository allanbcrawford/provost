import { mutation } from "./_generated/server";
import { requireUser } from "./lib/authz";

export const getOrProvisionFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    if (existing) return existing._id;

    const userId = await ctx.db.insert("users", {
      first_name: identity.givenName ?? identity.name?.split(" ")[0] ?? "",
      last_name: identity.familyName ?? identity.name?.split(" ").slice(1).join(" ") ?? "",
      email: identity.email ?? "",
      role: "member",
      generation: 2,
      clerk_user_id: identity.subject,
      onboarding_status: "pending",
    });
    return userId;
  },
});

export const me = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    return user;
  },
});
