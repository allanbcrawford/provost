"use node";
// Issue 2.1: conversational Add Family Member tool.
//
// Approval-gated: the LLM proposes the full payload (8 PRD §16.7 fields +
// optional enrichment), the user approves via the existing tool-call
// approval UI, then this handler fires. Mutates `family_users` (via the
// internal helper below — `family.createMember` is too restrictive on its
// `role` enum), persists a pending invite record, and writes an audit row.
//
// Clerk wiring is stubbed — see addFamilyMember.queueInvite below. Real
// invite delivery lands in a follow-up issue; today we record intent and
// rely on lifecycle_status="invited" + a TODO log line.

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
    userId?: Id<"users">;
    membershipId?: Id<"family_users">;
    stewardshipPhase?: string;
    inviteStatus?: string;
    message: string;
  }> => {
    const firstName = String(args?.firstName ?? "").trim();
    const preferredName = (args?.preferredName ? String(args.preferredName) : "").trim();
    const lastName = String(args?.lastName ?? "").trim();
    const dateOfBirth = String(args?.dateOfBirth ?? "").trim();
    const relationshipToFamily = String(args?.relationshipToFamily ?? "").trim();
    const roleInFamily = String(args?.roleInFamily ?? "").trim();
    const educationLevel = String(args?.educationLevel ?? "").trim();
    const email = String(args?.email ?? "").trim();
    const interests: string[] = Array.isArray(args?.interests)
      ? (args.interests as unknown[]).map((s) => String(s)).filter((s) => s.length > 0)
      : [];
    const preferredLearningStyle = (
      args?.preferredLearningStyle ? String(args.preferredLearningStyle) : ""
    ).trim();
    const stewardshipPhaseOverride =
      typeof args?.stewardshipPhaseOverride === "string"
        ? (args.stewardshipPhaseOverride as
            | "emerging"
            | "developing"
            | "operating"
            | "enduring")
        : null;

    if (!firstName || !lastName || !email || !dateOfBirth) {
      return {
        success: false,
        message:
          "Missing one of the required fields (firstName, lastName, email, dateOfBirth). Please re-collect.",
      };
    }

    const result = await ctx.runMutation(
      internal.agent.tools.addFamilyMemberInternal.persistMember,
      {
        runId,
        firstName,
        preferredName,
        lastName,
        dateOfBirth,
        relationshipToFamily,
        roleInFamily,
        educationLevel,
        email,
        interests,
        preferredLearningStyle,
        stewardshipPhaseOverride,
        toolCallId,
      },
    );

    // TODO(issue-2.1-followup): replace this stub with a real Clerk invite via
    // the Clerk admin SDK. Today we record intent only; the family_users row
    // lands as lifecycle_status="invited" so the UI shows the right pill.
    log("info", "add_family_member.invite_queued", {
      userId: result.userId,
      email,
      runId,
    });

    return {
      success: true,
      userId: result.userId,
      membershipId: result.membershipId,
      stewardshipPhase: result.stewardshipPhase,
      inviteStatus: "queued",
      message: `Added ${firstName} ${lastName}. Invite queued — they'll receive an email when Clerk wiring ships.`,
    };
  },
});
