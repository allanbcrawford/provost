import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const approve = mutation({
  args: { toolCallId: v.string() },
  handler: async () => {
    throw new Error("agent.approvals.approve not yet implemented (see Task 3.9)");
  },
});

export const reject = mutation({
  args: { toolCallId: v.string(), reason: v.optional(v.string()) },
  handler: async () => {
    throw new Error("agent.approvals.reject not yet implemented (see Task 3.9)");
  },
});
