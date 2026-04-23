"use node";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }) => {
    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, { runId });

    const email: string = args?.email ?? "";
    const role: string = args?.role ?? "member";

    const userId = await ctx.runMutation(api.family.createMember, {
      familyId: run.family_id,
      first_name: "",
      last_name: "",
      email,
      generation: 2,
      role: "member",
      familyRole: role as "admin" | "member" | "advisor" | "trustee",
    });

    // Phase 6 will send a real Clerk invite; log the intent for now
    console.log(`[invite_member] queued Clerk invite for userId=${userId} email=${email}`);

    return {
      success: true,
      userId,
      message: `Invitation sent to ${email}. They will receive an email to set up their account.`,
    };
  },
});
