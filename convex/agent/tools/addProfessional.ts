"use node";
// Issue 2.1: conversational Add Professional tool. Sibling of
// addFamilyMember.ts but writes to the `professionals` table and (for
// advisors) also creates a family_users row so the advisor can sign in and
// chat. Approval-gated.

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { log } from "../../lib/log";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (
    ctx,
    { args, toolCallId, runId },
  ): Promise<{
    success: boolean;
    professionalId?: Id<"professionals">;
    membershipId?: Id<"family_users"> | null;
    inviteStatus?: string;
    message: string;
  }> => {
    const firstName = String(args?.firstName ?? "").trim();
    const lastName = String(args?.lastName ?? "").trim();
    const firm = String(args?.firm ?? "").trim();
    const title = String(args?.title ?? "").trim();
    const professionalRole = String(args?.professionalRole ?? "").trim() as
      | "financial_advisor"
      | "estate_attorney"
      | "accountant"
      | "other";
    const email = String(args?.email ?? "").trim();
    const phone = (args?.phone ? String(args.phone) : "").trim();
    const relationshipToFamily = String(args?.relationshipToFamily ?? "").trim();
    const pageAccess: string[] = Array.isArray(args?.pageAccess)
      ? (args.pageAccess as unknown[]).map((s) => String(s)).filter((s) => s.length > 0)
      : [];

    if (!firstName || !lastName || !firm || !email || !professionalRole) {
      return {
        success: false,
        message:
          "Missing one of the required fields (firstName, lastName, firm, email, professionalRole). Please re-collect.",
      };
    }

    const result = await ctx.runMutation(
      internal.agent.tools.addProfessionalInternal.persistProfessional,
      {
        runId,
        firstName,
        lastName,
        firm,
        title,
        professionalRole,
        email,
        phone,
        relationshipToFamily,
        pageAccess,
        toolCallId,
      },
    );

    // TODO(issue-2.1-followup): real Clerk invite. The membership (if any)
    // is created with lifecycle_status="invited" so the UI shows the right
    // pill; the sweeper picks up `inviteStatus: "queued"` audit rows.
    log("info", "add_professional.invite_queued", {
      professionalId: result.professionalId,
      membershipId: result.membershipId,
      email,
      runId,
    });

    return {
      success: true,
      professionalId: result.professionalId,
      membershipId: result.membershipId,
      inviteStatus: "queued",
      message: `Added ${firstName} ${lastName} (${firm}). Invite queued.`,
    };
  },
});
