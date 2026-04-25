import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireSiteAdmin, requireUser, requireUserRecord } from "./lib/authz";

// ---------------------------------------------------------------------------
// Site-admin provisioning (bootstrap)
// ---------------------------------------------------------------------------
// The first site admin is minted via:
//   npx convex run users:promoteSiteAdmin '{"email":"you@example.com","value":true}'
// Site admins see the /(admin) UI (Library + Governance); family users do
// not. Distinct from family-scoped roles in `family_users.role`.
// ---------------------------------------------------------------------------

const DEMO_FAMILY_NAME = "Williams Family (demo)";

export const inviteTester = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const actor = await requireUserRecord(ctx);
    if (actor.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN_ROLE", required: ["admin"], actual: actor.role });
    }

    const demoFamily = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("name"), DEMO_FAMILY_NAME))
      .first();
    if (!demoFamily) {
      throw new ConvexError({ code: "DEMO_FAMILY_NOT_FOUND" });
    }

    // Create a stub user record that will be linked once the tester signs in.
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    let userId = existingUser?._id;
    if (!userId) {
      userId = await ctx.db.insert("users", {
        first_name: "",
        last_name: "",
        email,
        role: "member",
        generation: 2,
        clerk_user_id: `pending-invite-${email}`,
        onboarding_status: "pending",
      });
    }

    // Ensure the user is not already a member of the demo family.
    const existingMembership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) =>
        q.eq("family_id", demoFamily._id).eq("user_id", userId!),
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("family_users", {
        family_id: demoFamily._id,
        user_id: userId,
        role: "member",
      });
    }

    // TODO(Phase 8+): replace this stub with a real Clerk Invitations API call.
    // POST https://api.clerk.com/v1/invitations
    //   { email_address: email, redirect_url: "https://staging.provost.app/sign-up" }
    // Authorization: Bearer <CLERK_SECRET_KEY>
    // The response contains `url` — log it server-side for manual sharing during Phase 7.
    let inviteUrl: string | null = null;
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (clerkSecret) {
      try {
        const res = await fetch("https://api.clerk.com/v1/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clerkSecret}`,
          },
          body: JSON.stringify({
            email_address: email,
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://staging.provost.app"}/sign-up`,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { url?: string };
          inviteUrl = data.url ?? null;
          console.log(`[inviteTester] Clerk invite URL for ${email}: ${inviteUrl}`);
        } else {
          console.warn(`[inviteTester] Clerk API returned ${res.status} for ${email}`);
        }
      } catch (err) {
        console.warn("[inviteTester] Clerk invite fetch failed:", err);
      }
    } else {
      console.log(`[inviteTester] CLERK_SECRET_KEY not set — skipping Clerk invite for ${email}`);
    }

    await writeAudit(ctx, {
      familyId: demoFamily._id,
      actorUserId: actor._id,
      actorKind: "user",
      category: "auth",
      action: "tester_invited",
      resourceType: "user",
      resourceId: String(userId),
      metadata: { email, hasInviteUrl: inviteUrl !== null },
    });

    return { userId, inviteUrl };
  },
});

export const listTesters = mutation({
  args: {},
  handler: async (ctx) => {
    const actor = await requireUserRecord(ctx);
    if (actor.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN_ROLE", required: ["admin"], actual: actor.role });
    }

    const demoFamily = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("name"), DEMO_FAMILY_NAME))
      .first();
    if (!demoFamily) return [];

    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", demoFamily._id))
      .collect();

    const users = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.user_id);
        return user ? { ...user, memberRole: m.role } : null;
      }),
    );

    return users.filter(Boolean);
  },
});

export const getOrProvisionFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    if (existing) return existing._id;

    // Claim a previously-stubbed row (from inviteTester / bootstrapSiteAdmin)
    // matched by email. Preserves any flags we pre-set (e.g. is_site_admin).
    const email = identity.email ?? "";
    if (email) {
      const pending = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (pending && pending.clerk_user_id.startsWith("pending-invite-")) {
        await ctx.db.patch(pending._id, {
          clerk_user_id: identity.subject,
          first_name:
            pending.first_name || identity.givenName || identity.name?.split(" ")[0] || "",
          last_name:
            pending.last_name ||
            identity.familyName ||
            identity.name?.split(" ").slice(1).join(" ") ||
            "",
          onboarding_status: "claimed",
        });
        return pending._id;
      }
    }

    const userId = await ctx.db.insert("users", {
      first_name: identity.givenName ?? identity.name?.split(" ")[0] ?? "",
      last_name: identity.familyName ?? identity.name?.split(" ").slice(1).join(" ") ?? "",
      email,
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

// Read-only counterpart to `me`. Use this from `useQuery`; reactive across
// updates without triggering a write.
export const meQuery = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    return user;
  },
});

// Small, cheap query used by the admin UI to decide whether to render the
// /(admin) layout or redirect away. Never throws for signed-in users; returns
// { isSiteAdmin: false } when the row exists but the flag is unset.
export const meSiteAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { isSiteAdmin: false };
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    return { isSiteAdmin: user?.is_site_admin === true };
  },
});

// Grant or revoke site-admin. Internal-only: invoked via `npx convex run`.
export const promoteSiteAdmin = internalMutation({
  args: { email: v.string(), value: v.boolean() },
  handler: async (ctx, { email, value }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new ConvexError({ code: "USER_NOT_FOUND", email });
    await ctx.db.patch(user._id, { is_site_admin: value });
    await writeAudit(ctx, {
      actorUserId: user._id,
      actorKind: "system",
      category: "auth",
      action: value ? "site_admin.granted" : "site_admin.revoked",
      resourceType: "user",
      resourceId: String(user._id),
      metadata: { email },
    });
    return { userId: user._id, is_site_admin: value };
  },
});

// Top-level families roster for site admins. Returns family name + member
// count only — no per-family data. This lands the shape for the future
// admin "Families" list view; unused by UI in this pass.
export const listFamiliesForSiteAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireSiteAdmin(ctx);
    const families = await ctx.db.query("families").collect();
    const active = families.filter((f) => !f.deleted_at);
    const results = await Promise.all(
      active.map(async (f) => {
        const memberships = await ctx.db
          .query("family_users")
          .withIndex("by_family", (q) => q.eq("family_id", f._id))
          .collect();
        return {
          _id: f._id,
          name: f.name,
          description: f.description ?? null,
          member_count: memberships.length,
        };
      }),
    );
    return results.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Demo helper (internal): removes a user's membership in a named family.
// Idempotent — bails if no membership exists.
export const removeUserFromFamilyByEmail = internalMutation({
  args: {
    email: v.string(),
    familyName: v.string(),
  },
  handler: async (ctx, { email, familyName }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new ConvexError({ code: "USER_NOT_FOUND", email });
    }
    const family = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("name"), familyName))
      .first();
    if (!family) {
      throw new ConvexError({ code: "FAMILY_NOT_FOUND", familyName });
    }
    const membership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", family._id).eq("user_id", user._id))
      .unique();
    if (!membership) {
      return { action: "noop" as const };
    }
    await ctx.db.delete(membership._id);
    return { action: "deleted" as const, membershipId: membership._id };
  },
});

// Demo helper (internal): rewrite the email on a seeded user so it matches
// the email the tester will sign up with in Clerk.
//
//   npx convex run users:setSeededMemberEmail \
//     '{"firstName":"Linda","lastName":"Williams","email":"linda.williams@provostdemo.com"}'
export const setSeededMemberEmail = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { firstName, lastName, email }) => {
    const candidates = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(q.eq(q.field("first_name"), firstName), q.eq(q.field("last_name"), lastName)),
      )
      .collect();
    const seeded = candidates.find((u) => u.clerk_user_id.startsWith("seed-"));
    if (!seeded) {
      throw new ConvexError({ code: "SEEDED_MEMBER_NOT_FOUND", firstName, lastName });
    }
    await ctx.db.patch(seeded._id, { email });
    return { userId: seeded._id, email };
  },
});

// Demo helper (internal): adds an existing Clerk-authed user (looked up by
// email) to a family with the given role. Idempotent — bails if the user
// already has a membership in that family.
//
//   npx convex run users:addUserToFamilyByEmail \
//     '{"email":"someone@example.com","familyName":"Williams Family (demo)","role":"admin"}'
export const addUserToFamilyByEmail = internalMutation({
  args: {
    email: v.string(),
    familyName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("advisor"),
      v.literal("trustee"),
    ),
  },
  handler: async (ctx, { email, familyName, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        email,
        hint: "Sign in once with this email so a users row is provisioned.",
      });
    }
    const family = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("name"), familyName))
      .first();
    if (!family) {
      throw new ConvexError({ code: "FAMILY_NOT_FOUND", familyName });
    }
    const existing = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", family._id).eq("user_id", user._id))
      .unique();
    if (existing) {
      if (existing.role !== role) {
        await ctx.db.patch(existing._id, { role });
        return { membershipId: existing._id, action: "role_updated" as const };
      }
      return { membershipId: existing._id, action: "noop" as const };
    }
    const membershipId = await ctx.db.insert("family_users", {
      family_id: family._id,
      user_id: user._id,
      role,
    });
    return { membershipId, action: "inserted" as const };
  },
});

// Demo helper (internal, no Clerk session required): link an existing Clerk
// account — identified by email — to a seeded family member, WITHOUT
// upgrading to admin. Use this to populate a non-admin tester for member-side
// browser audits.
//
//   npx convex run users:linkSeededMemberByEmail \
//     '{"email":"linda.williams@provostdemo.com","firstName":"Linda","lastName":"Williams"}'
//
// Prereq: the Clerk user must already exist in `users` (i.e. they've signed in
// at least once so `getOrProvisionFromClerk` minted a row). The function looks
// up that row by email, finds the seeded family member by first+last name,
// transplants the Clerk ownership onto the seeded row, deletes the duplicate,
// and ensures family_users.role is "member".
export const linkSeededMemberByEmail = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, { email, firstName, lastName }) => {
    // Find the Clerk-bound user by email. There may be multiple rows with this
    // email (a seeded stub + a freshly Clerk-provisioned row that shares the
    // email after a previous setSeededMemberEmail run); we want the
    // non-seed row specifically.
    const emailMatches = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const clerkUser = emailMatches.find((u) => !u.clerk_user_id.startsWith("seed-"));
    if (!clerkUser) {
      throw new ConvexError({
        code: "CLERK_USER_NOT_FOUND",
        email,
        hint: "Sign in once with this email so getOrProvisionFromClerk creates the row, then re-run.",
      });
    }

    // Find the seeded family member by name.
    const candidates = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(q.eq(q.field("first_name"), firstName), q.eq(q.field("last_name"), lastName)),
      )
      .collect();
    const seeded = candidates.find((u) => u.clerk_user_id.startsWith("seed-"));
    if (!seeded) {
      throw new ConvexError({
        code: "SEEDED_MEMBER_NOT_FOUND",
        firstName,
        lastName,
      });
    }
    if (seeded._id === clerkUser._id) {
      // Defensive — shouldn't happen because we filtered to seed- rows.
      throw new ConvexError({ code: "ALREADY_LINKED" });
    }

    // Move any family_users rows from the Clerk-auto-provisioned user to the
    // seeded one, then delete the duplicate.
    const strayMemberships = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", clerkUser._id))
      .collect();
    for (const m of strayMemberships) {
      await ctx.db.delete(m._id);
    }
    const clerkSubject = clerkUser.clerk_user_id;
    await ctx.db.delete(clerkUser._id);

    // Transplant Clerk ownership onto the seeded row. Keep role as "member".
    await ctx.db.patch(seeded._id, {
      clerk_user_id: clerkSubject,
      email,
      role: "member",
      onboarding_status: "claimed",
    });

    // Ensure they have a family_users row as a regular member.
    const membership = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", seeded._id))
      .first();
    if (membership && membership.role === "admin") {
      await ctx.db.patch(membership._id, { role: "member" });
    }

    await writeAudit(ctx, {
      familyId: membership?.family_id,
      actorUserId: seeded._id,
      actorKind: "system",
      category: "auth",
      action: "seed_member_linked_as_member",
      resourceType: "user",
      resourceId: String(seeded._id),
      metadata: { firstName, lastName, email, clerkSubject },
    });

    return {
      userId: seeded._id,
      familyId: membership?.family_id ?? null,
      role: "member",
    };
  },
});

// Demo helper: link the current signed-in Clerk identity to a seeded family member.
// Finds the seeded user by first+last name (clerk_user_id starts with "seed-"),
// swaps ownership to the current Clerk subject, deletes the auto-provisioned duplicate,
// and makes sure the user has a family_users row as admin for demo access.
export const claimSeededMember = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, { firstName, lastName }) => {
    const identity = await requireUser(ctx);

    // Find the seeded member by name (unclaimed only).
    const candidates = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(q.eq(q.field("first_name"), firstName), q.eq(q.field("last_name"), lastName)),
      )
      .collect();
    const seeded = candidates.find((u) => u.clerk_user_id.startsWith("seed-"));
    if (!seeded) {
      throw new ConvexError({
        code: "SEEDED_MEMBER_NOT_FOUND",
        firstName,
        lastName,
      });
    }

    // Drop any duplicate user auto-provisioned from the current Clerk sign-in.
    const autoProvisioned = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    if (autoProvisioned && autoProvisioned._id !== seeded._id) {
      // Move any family_users rows from the auto-provisioned user to the seeded one
      // before deleting (defensive; usually there are none).
      const strayMemberships = await ctx.db
        .query("family_users")
        .withIndex("by_user", (q) => q.eq("user_id", autoProvisioned._id))
        .collect();
      for (const m of strayMemberships) {
        await ctx.db.delete(m._id);
      }
      await ctx.db.delete(autoProvisioned._id);
    }

    // Claim the seeded row: swap clerk_user_id + bump role to admin for demo access.
    await ctx.db.patch(seeded._id, {
      clerk_user_id: identity.subject,
      email: identity.email ?? seeded.email,
      role: "admin",
      onboarding_status: "claimed",
    });

    // Ensure the seeded user has an admin family_users row for the demo family.
    const membership = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", seeded._id))
      .first();
    if (membership && membership.role !== "admin") {
      await ctx.db.patch(membership._id, { role: "admin" });
    }

    await writeAudit(ctx, {
      familyId: membership?.family_id,
      actorUserId: seeded._id,
      actorKind: "user",
      category: "auth",
      action: "seed_member_claimed",
      resourceType: "user",
      resourceId: String(seeded._id),
      metadata: { firstName, lastName, clerkSubject: identity.subject },
    });

    return { userId: seeded._id, familyId: membership?.family_id ?? null };
  },
});
