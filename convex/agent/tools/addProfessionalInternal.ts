// Internal mutation backing the addProfessional tool action.
//
// Brad-decision flag: today we always insert into `professionals` (the
// per-family roster). When `professionalRole === "financial_advisor"` we ALSO
// create a family_users row with role="advisor" so the advisor can sign in
// and chat as part of the family. Accountants / estate attorneys / "other"
// are recorded in `professionals` only — they do NOT get a Clerk account by
// default until per-page permissions ship in V2 (PRD §16.9). Brad to
// confirm this default before we ship.

import { ConvexError, v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { writeAudit } from "../../lib/audit";
import { requireFamilyMember } from "../../lib/authz";
import { checkAndIncrement } from "../../lib/rateLimit";

const professionalRoleValidator = v.union(
  v.literal("financial_advisor"),
  v.literal("estate_attorney"),
  v.literal("accountant"),
  v.literal("other"),
);

function professionLabel(role: "financial_advisor" | "estate_attorney" | "accountant" | "other") {
  switch (role) {
    case "financial_advisor":
      return "Financial Advisor";
    case "estate_attorney":
      return "Estate Attorney";
    case "accountant":
      return "Accountant";
    case "other":
      return "Professional";
  }
}

export const persistProfessional = internalMutation({
  args: {
    runId: v.id("thread_runs"),
    firstName: v.string(),
    lastName: v.string(),
    firm: v.string(),
    title: v.string(),
    professionalRole: professionalRoleValidator,
    email: v.string(),
    phone: v.string(),
    relationshipToFamily: v.string(),
    pageAccess: v.array(v.string()),
    toolCallId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    professionalId: Id<"professionals">;
    membershipId: Id<"family_users"> | null;
  }> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError({ code: "RUN_NOT_FOUND" });

    const familyId = run.family_id;
    const { user: actor } = await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);

    await checkAndIncrement(ctx, "tool.add_professional:family", familyId);

    const fullName = [args.firstName, args.lastName].filter(Boolean).join(" ").trim();
    const professionalId: Id<"professionals"> = await ctx.db.insert("professionals", {
      family_id: familyId,
      name: fullName,
      profession: professionLabel(args.professionalRole),
      firm: args.firm,
      email: args.email,
    });

    // Advisors get a real family_users membership so they can sign in and
    // operate as advisor across the family. Other roles (attorney /
    // accountant / other) stay roster-only until V2 perms ship.
    let membershipId: Id<"family_users"> | null = null;
    if (args.professionalRole === "financial_advisor") {
      const userId: Id<"users"> = await ctx.db.insert("users", {
        first_name: args.firstName,
        last_name: args.lastName,
        email: args.email,
        phone_number: args.phone || undefined,
        role: "member", // top-level platform role — not the per-family role
        generation: 2, // advisors are operating-band by default
        clerk_user_id: `provisional:${args.email}`,
        onboarding_status: "pending",
        stewardship_phase: "operating",
      });
      membershipId = await ctx.db.insert("family_users", {
        family_id: familyId,
        user_id: userId,
        role: "advisor",
        lifecycle_status: "invited",
      });
    }

    await writeAudit(ctx, {
      familyId,
      actorUserId: actor._id,
      actorKind: "user",
      category: "tool_call",
      action: "agent.tool.add_professional",
      resourceType: "professionals",
      resourceId: professionalId,
      metadata: {
        toolCallId: args.toolCallId,
        runId: args.runId,
        professionalRole: args.professionalRole,
        firm: args.firm,
        title: args.title,
        relationshipToFamily: args.relationshipToFamily,
        pageAccess: args.pageAccess,
        membershipCreated: membershipId !== null,
        inviteStatus: "queued",
      },
    });

    return { professionalId, membershipId };
  },
});
