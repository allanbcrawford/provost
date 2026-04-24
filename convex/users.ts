import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireUser, requireUserRecord } from "./lib/authz";

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
