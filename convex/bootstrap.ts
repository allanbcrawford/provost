"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/**
 * One-shot: invite a user via Clerk, pre-create a Convex users row for them
 * with `is_site_admin = true`. When they accept the invite + sign in, the
 * existing `getOrProvisionFromClerk` flow claims this row by email, preserving
 * the admin flag.
 *
 * Run:
 *   npx convex run bootstrap:inviteSiteAdmin '{"email":"you@example.com"}'
 */
export const inviteSiteAdmin = internalAction({
  args: { email: v.string() },
  handler: async (
    ctx,
    { email },
  ): Promise<{
    userId: string;
    inviteUrl: string | null;
    alreadyExisted: boolean;
  }> => {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      throw new Error("CLERK_SECRET_KEY is not set on this Convex deployment.");
    }

    let inviteUrl: string | null = null;
    try {
      const redirectUrl = `${
        process.env.NEXT_PUBLIC_APP_URL ?? "https://staging.provost.app"
      }/sign-up`;
      const res = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkSecret}`,
        },
        body: JSON.stringify({ email_address: email, redirect_url: redirectUrl }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        inviteUrl = data.url ?? null;
      } else {
        const body = await res.text();
        console.warn(
          `[inviteSiteAdmin] Clerk API ${res.status} for ${email}: ${body.slice(0, 500)}`,
        );
      }
    } catch (err) {
      console.warn("[inviteSiteAdmin] Clerk invite fetch failed:", err);
    }

    const { userId, alreadyExisted } = await ctx.runMutation(
      internal.bootstrap.provisionSiteAdminRow,
      { email },
    );

    return { userId: String(userId), inviteUrl, alreadyExisted };
  },
});
