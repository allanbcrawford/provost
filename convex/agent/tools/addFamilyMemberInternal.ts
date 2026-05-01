// Internal mutation backing the addFamilyMember tool action. Splits DB-writes
// out of the Node-runtime action because the action handler can't touch
// ctx.db directly.
//
// Authorization: only family admins or advisors are allowed to add members.
// The original `family.createMember` mutation is restricted to "admin" only;
// we widen here to admin OR advisor (matching the gap-analysis Pillar 1
// requirement that advisors can add members on behalf of a family).

import { ConvexError, v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { writeAudit } from "../../lib/audit";
import { requireFamilyMember } from "../../lib/authz";
import { checkAndIncrement } from "../../lib/rateLimit";
import { ageFromDateOfBirth } from "../../lib/generationTone";
import {
  type StewardshipPhase,
  assignStewardshipPhase,
} from "../../lib/stewardshipPhase";

const phaseValidator = v.union(
  v.literal("emerging"),
  v.literal("developing"),
  v.literal("operating"),
  v.literal("enduring"),
);

// Map a PRD §16.7 free-text "roleInFamily" string onto the storage-level
// family_users.role enum. Granular roles (grantor, beneficiary, child, etc.)
// don't have a direct storage column today — they're captured in audit
// metadata and surfaced in the conversational summary. Issue 2.2 will widen
// the schema to a proper relationship-role column.
function mapToStorageRole(
  role: string,
): "admin" | "member" | "advisor" | "trustee" {
  const r = role.trim().toLowerCase();
  if (r === "admin" || r === "family_admin") return "admin";
  if (r === "advisor") return "advisor";
  if (r === "trustee") return "trustee";
  // grantor / beneficiary / spouse / child / sibling / parent / cousin / etc.
  return "member";
}

export const persistMember = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    firstName: v.string(),
    preferredName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    relationshipToFamily: v.string(),
    roleInFamily: v.string(),
    educationLevel: v.string(),
    email: v.string(),
    interests: v.array(v.string()),
    preferredLearningStyle: v.string(),
    stewardshipPhaseOverride: v.union(phaseValidator, v.null()),
    toolCallId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    userId: Id<"users">;
    membershipId: Id<"family_users">;
    stewardshipPhase: StewardshipPhase;
  }> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });

    const familyId = run.family_id;
    const { user: actor } = await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);

    await checkAndIncrement(ctx, "tool.add_family_member:family", familyId);

    const familyRole = mapToStorageRole(args.roleInFamily);

    // Compute stewardship phase using the canonical helper. The dropdown UI
    // (Issue 2.2) will let admins override before insert; here the LLM
    // forwards the user's explicit override via stewardshipPhaseOverride.
    const age = ageFromDateOfBirth(args.dateOfBirth);
    const stewardshipPhase: StewardshipPhase =
      args.stewardshipPhaseOverride ??
      assignStewardshipPhase({ age, role: args.roleInFamily });

    // Best-effort generation inference: 60+ → 1, 35–59 → 2, <35 → 3. Matches
    // the existing demo-seeder convention for new rows that lack an
    // explicit generation column.
    const generation = age === null ? 2 : age >= 60 ? 1 : age >= 35 ? 2 : 3;

    const userId: Id<"users"> = await ctx.db.insert("users", {
      first_name: args.firstName,
      last_name: args.lastName,
      email: args.email,
      date_of_birth: args.dateOfBirth,
      education: args.educationLevel || undefined,
      role: familyRole === "admin" ? "admin" : "member",
      generation,
      // Provisional Clerk handle until the real invite lands; lifecycle
      // mirrors the same convention used by family.createMember.
      clerk_user_id: `provisional:${args.email}`,
      onboarding_status: "pending",
      stewardship_phase: stewardshipPhase,
    });

    const membershipId: Id<"family_users"> = await ctx.db.insert("family_users", {
      family_id: familyId,
      user_id: userId,
      role: familyRole,
      lifecycle_status: "invited",
    });

    await writeAudit(ctx, {
      familyId,
      actorUserId: actor._id,
      actorKind: "user",
      category: "tool_call",
      action: "agent.tool.add_family_member",
      resourceType: "users",
      resourceId: userId,
      metadata: {
        toolCallId: args.toolCallId,
        runId: args.runId,
        // Capture the rich PRD-only fields here so they're not lost — the
        // users/family_users tables don't have columns for them yet.
        relationshipToFamily: args.relationshipToFamily,
        roleInFamily: args.roleInFamily,
        preferredName: args.preferredName,
        interests: args.interests,
        preferredLearningStyle: args.preferredLearningStyle,
        stewardshipPhase,
        stewardshipPhaseOverridden: args.stewardshipPhaseOverride !== null,
        familyRoleStored: familyRole,
        // Marker for the follow-up Clerk invite — pickable by a sweeper.
        inviteStatus: "queued",
      },
    });

    return { userId, membershipId, stewardshipPhase };
  },
});
