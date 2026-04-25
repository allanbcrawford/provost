// Shared test helpers. Keeps the per-test setup compact + readable.
//
// Convention: every helper takes the `t` returned by `convexTest(schema)`
// and operates with admin privileges via `t.run`, so callers don't need to
// mock auth identities for setup. Identity-driven calls go through
// `t.withIdentity({ subject }).query/mutation(...)` from the test body.

import type { GenericId } from "convex/values";
import type { TestConvex } from "convex-test";
import type schema from "../convex/schema";

type T = TestConvex<typeof schema>;

export type SeedFamily = {
  familyId: GenericId<"families">;
  adminUserId: GenericId<"users">;
  adminClerkSubject: string;
  memberUserId: GenericId<"users">;
  memberClerkSubject: string;
  otherMemberUserId: GenericId<"users">;
  otherMemberClerkSubject: string;
};

let counter = 0;

// Mints a family with three users:
//   admin  — family_users.role = "admin"
//   member — family_users.role = "member" (subject to ACL)
//   other  — family_users.role = "member" (used to verify "not on this row" path)
//
// Site-admin flag is unset on all three so admin behavior comes from family
// role only.
export async function seedFamily(t: T, label = "TestFamily"): Promise<SeedFamily> {
  counter++;
  const id = counter;
  const adminClerkSubject = `clerk-admin-${id}`;
  const memberClerkSubject = `clerk-member-${id}`;
  const otherMemberClerkSubject = `clerk-other-${id}`;

  return await t.run(async (ctx) => {
    const adminUserId = await ctx.db.insert("users", {
      first_name: "Admin",
      last_name: `Family${id}`,
      email: `admin-${id}@test.invalid`,
      role: "admin",
      generation: 1,
      clerk_user_id: adminClerkSubject,
      onboarding_status: "claimed",
    });
    const memberUserId = await ctx.db.insert("users", {
      first_name: "Member",
      last_name: `Family${id}`,
      email: `member-${id}@test.invalid`,
      role: "member",
      generation: 2,
      clerk_user_id: memberClerkSubject,
      onboarding_status: "claimed",
    });
    const otherMemberUserId = await ctx.db.insert("users", {
      first_name: "Other",
      last_name: `Family${id}`,
      email: `other-${id}@test.invalid`,
      role: "member",
      generation: 2,
      clerk_user_id: otherMemberClerkSubject,
      onboarding_status: "claimed",
    });

    const familyId = await ctx.db.insert("families", {
      name: `${label} ${id}`,
      created_by: adminUserId,
    });

    await ctx.db.insert("family_users", {
      family_id: familyId,
      user_id: adminUserId,
      role: "admin",
    });
    await ctx.db.insert("family_users", {
      family_id: familyId,
      user_id: memberUserId,
      role: "member",
    });
    await ctx.db.insert("family_users", {
      family_id: familyId,
      user_id: otherMemberUserId,
      role: "member",
    });

    return {
      familyId,
      adminUserId,
      adminClerkSubject,
      memberUserId,
      memberClerkSubject,
      otherMemberUserId,
      otherMemberClerkSubject,
    };
  });
}

// Convenience to wrap a t.withIdentity() call with the seed shape's subject.
export function asSubject(t: T, subject: string) {
  // The token issuer / clerk-issuer pieces don't matter for convex-test's
  // identity check; what matters is `subject` matches the user row's
  // clerk_user_id. Including a stable issuer just keeps the identity object
  // shape close to what Clerk would produce in production.
  return t.withIdentity({
    subject,
    issuer: "https://test.clerk.accounts.dev",
    tokenIdentifier: `https://test.clerk.accounts.dev|${subject}`,
  });
}

// Insert a document directly via t.run + grant the admin owner. Returns the
// new document id. Use this in tests where you need a row but don't want to
// exercise the full documents.create flow.
export async function seedDocument(
  t: T,
  args: { familyId: GenericId<"families">; ownerUserId: GenericId<"users">; name?: string },
): Promise<GenericId<"documents">> {
  return await t.run(async (ctx) => {
    const documentId = await ctx.db.insert("documents", {
      family_id: args.familyId,
      name: args.name ?? "Test Document",
      category: "estate",
      type: "trust",
      observation_type: "observation",
      observation_is_observed: false,
    });
    await ctx.db.insert("resource_parties", {
      family_id: args.familyId,
      resource_type: "document",
      resource_id: documentId,
      user_id: args.ownerUserId,
      role: "owner",
      granted_by: args.ownerUserId,
      granted_at: Date.now(),
    });
    return documentId;
  });
}

// Insert a signal with given member_ids and grant party rows so the access
// model matches what generateFromRules would produce in production.
export async function seedSignal(
  t: T,
  args: {
    familyId: GenericId<"families">;
    ownerUserId: GenericId<"users">;
    memberIds?: GenericId<"users">[];
    title?: string;
  },
): Promise<GenericId<"signals">> {
  const memberIds = args.memberIds ?? [];
  return await t.run(async (ctx) => {
    const signalId = await ctx.db.insert("signals", {
      family_id: args.familyId,
      severity: "review",
      category: "recommendation",
      title: args.title ?? "Test signal",
      reason: "Test reason",
      member_ids: memberIds,
      status: "open",
      source: "rule",
      rule_key: `test-${Date.now()}-${Math.random()}`,
    });
    await ctx.db.insert("resource_parties", {
      family_id: args.familyId,
      resource_type: "signal",
      resource_id: signalId,
      user_id: args.ownerUserId,
      role: "owner",
      granted_by: args.ownerUserId,
      granted_at: Date.now(),
    });
    for (const memberId of memberIds) {
      if (memberId === args.ownerUserId) continue;
      await ctx.db.insert("resource_parties", {
        family_id: args.familyId,
        resource_type: "signal",
        resource_id: signalId,
        user_id: memberId,
        role: "party",
        granted_by: args.ownerUserId,
        granted_at: Date.now(),
      });
    }
    return signalId;
  });
}
