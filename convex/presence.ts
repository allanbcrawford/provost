import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { maybeUserRecord, requireFamilyMember, requireUserRecord } from "./lib/authz";

// Issue 6.5 — Active users presence.
//
// Heartbeat-driven online status. Clients call `heartbeat` every ~30s while
// a tab is visible; `listActive` reactively re-emits as rows update. The 60s
// active window naturally tolerates the 30s heartbeat interval (one missed
// beat still keeps the user active).
//
// No live chat affordance is built on top of this in V1 — see ADR. The
// Active section in the sidebar is presence-only.

const ACTIVE_WINDOW_MS_DEFAULT = 60_000;

// Upsert the caller's presence row. No role gating — every signed-in user
// can heartbeat. The `familyId` and `surface` are best-effort metadata so
// that future server-side analytics can describe where users are spending
// time; nothing in V1 depends on them.
export const heartbeat = mutation({
  args: {
    familyId: v.optional(v.id("families")),
    surface: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserRecord(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        last_seen_at: now,
        family_id: args.familyId ?? existing.family_id,
        surface: args.surface ?? existing.surface,
      });
      return { presenceId: existing._id, action: "patched" as const };
    }

    const presenceId = await ctx.db.insert("presence", {
      user_id: user._id,
      last_seen_at: now,
      family_id: args.familyId,
      surface: args.surface,
    });
    return { presenceId, action: "inserted" as const };
  },
});

export type ActivePresenceRow = {
  userId: Id<"users">;
  displayName: string;
  role: string;
  lastSeenAt: number;
  surface: string | null;
};

// List users active in `familyId` within the last `withinSeconds`. Includes
// every `family_users` membership for the family (members, admins, advisors,
// trustees) — i.e. everyone with permission to be in this family — and
// returns only those whose presence row is fresh.
//
// Gated by `requireFamilyMember`: only members of the family can see who is
// online in it. An advisor on family A cannot ever see family B's roster
// from this query, even though their `family_users` row in B exists; the
// gate is applied at this call's `familyId`.
export const listActive = query({
  args: {
    familyId: v.id("families"),
    withinSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActivePresenceRow[]> => {
    await requireFamilyMember(ctx, args.familyId);
    const windowMs = (args.withinSeconds ?? 60) * 1000;
    const threshold = Date.now() - windowMs;

    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", args.familyId))
      .collect();

    const results: ActivePresenceRow[] = [];
    for (const m of memberships) {
      if (m.lifecycle_status === "suspended") continue;
      const presenceRow = await ctx.db
        .query("presence")
        .withIndex("by_user", (q) => q.eq("user_id", m.user_id))
        .unique();
      if (!presenceRow) continue;
      if (presenceRow.last_seen_at < threshold) continue;

      const userDoc: Doc<"users"> | null = await ctx.db.get(m.user_id);
      if (!userDoc) continue;

      const displayName = formatDisplayName(userDoc);
      results.push({
        userId: m.user_id,
        displayName,
        role: m.role,
        lastSeenAt: presenceRow.last_seen_at,
        surface: presenceRow.surface ?? null,
      });
    }

    // Most recently active first.
    results.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return results;
  },
});

// Caller's own presence row (or null). Returned as a thin shape for
// client-side coordination (e.g. so the UI can show "you" without re-doing
// the upsert from a query). Unauthenticated callers get null instead of
// throwing — this is a soft, frequently-fired query.
export const listMyOwnPresence = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    userId: Id<"users">;
    lastSeenAt: number;
    familyId: Id<"families"> | null;
    surface: string | null;
  } | null> => {
    const user = await maybeUserRecord(ctx);
    if (!user) return null;
    const row = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .unique();
    if (!row) return null;
    return {
      userId: row.user_id,
      lastSeenAt: row.last_seen_at,
      familyId: row.family_id ?? null,
      surface: row.surface ?? null,
    };
  },
});

function formatDisplayName(user: Doc<"users">): string {
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined.length > 0) return combined;
  if (user.email && user.email.length > 0) return user.email;
  return "Unknown";
}
