// Advisor cross-family aggregate queries (Issue 6.1, PRD §18).
//
// These queries are intentionally cross-family: an advisor user is assigned to
// many families via `family_users` rows where `role === 'advisor'`, and the
// advisor's home view rolls up summary counts and curated previews across
// every assigned family.
//
// IMPORTANT — isolation rules:
//   1. Every query MUST scope its scans to families this caller is assigned to
//      via `family_users` (role = "advisor"). NEVER expose data from a family
//      the caller is not assigned to.
//   2. Queries return only counts + a small curated list of preview items
//      (top-5 most recent observations / nearest events). They do not return
//      raw per-family records that callers could enumerate.
//   3. We do not use `requireFamilyMember` here (that helper is single-family
//      by design); instead we re-implement the membership check by listing
//      the caller's `family_users` rows up front and using only those ids.

import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { requireUserRecord } from "./lib/authz";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_MS = 14 * DAY_MS;
const STALLED_WINDOW_MS = 90 * DAY_MS;
const UPCOMING_EVENT_WINDOW_MS = 14 * DAY_MS;
const FAMILY_RECENT_ACTIVITY_MS = 30 * DAY_MS;

// Phase 5.4 / 5.5 follow-ups added denormalized `last_message_at` on
// `threads` and `last_touched_at` on `lesson_users`, but those fields haven't
// reached the schema validators on this branch yet (see lib/threads.ts and
// lib/lessonUsers.ts). Read them through tolerant casts so this module
// compiles before the schema PRs land. When unset we fall back to
// `_creationTime`, which still produces a useful "recent activity" signal.
function threadActivityAt(t: { _creationTime: number }): number {
  const v = (t as { last_message_at?: number }).last_message_at;
  return v ?? t._creationTime;
}
function lessonTouchedAt(r: { _creationTime: number }): number {
  const v = (r as { last_touched_at?: number }).last_touched_at;
  return v ?? r._creationTime;
}

// Resolve the caller's set of advisor assignments, returning the assigned
// family rows and the matching membership rows. Throws FORBIDDEN_ROLE if the
// caller has zero advisor assignments — this prevents a non-advisor from
// invoking these queries to enumerate aggregate counts.
async function loadAdvisorAssignments(ctx: QueryCtx) {
  const user = await requireUserRecord(ctx);
  const memberships = await ctx.db
    .query("family_users")
    .withIndex("by_user", (q) => q.eq("user_id", user._id))
    .collect();
  const advisorMemberships = memberships.filter(
    (m) => m.role === "advisor" && m.lifecycle_status !== "suspended",
  );
  if (advisorMemberships.length === 0) {
    throw new ConvexError({ code: "FORBIDDEN_ROLE", required: ["advisor"], actual: "none" });
  }
  const families = await Promise.all(
    advisorMemberships.map(async (m) => {
      const family = await ctx.db.get(m.family_id);
      return family && !family.deleted_at ? family : null;
    }),
  );
  const pairs = advisorMemberships
    .map((m, i) => ({ membership: m, family: families[i] }))
    .filter((p): p is { membership: typeof p.membership; family: NonNullable<typeof p.family> } =>
      p.family !== null,
    );
  return { user, pairs };
}

// Returns the list of families this advisor is assigned to with summary
// fields used by the family-selector dropdown.
export const assignedFamilies = query({
  args: {},
  handler: async (ctx) => {
    const { pairs } = await loadAdvisorAssignments(ctx);
    const out = await Promise.all(
      pairs.map(async ({ family }) => {
        const familyId = family._id;

        const memberships = await ctx.db
          .query("family_users")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
        const memberCount = memberships.filter((m) => m.role === "member").length;

        const threads = await ctx.db
          .query("threads")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
        let lastActivityAt = family._creationTime;
        for (const t of threads) {
          if (t.deleted_at) continue;
          const v = threadActivityAt(t);
          if (v > lastActivityAt) lastActivityAt = v;
        }

        const obs = await ctx.db
          .query("observations")
          .withIndex("by_family", (q) => q.eq("family_id", familyId))
          .collect();
        const pendingObservationCount = obs.filter(
          (o) => !o.deleted_at && o.status === "new",
        ).length;

        return {
          id: familyId,
          name: family.name,
          memberCount,
          lastActivityAt,
          pendingObservationCount,
        };
      }),
    );
    // Sort by last activity desc so the dropdown surfaces actively-engaged
    // families first; the chip caller can re-sort if needed.
    out.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    return out;
  },
});

type RecentObservation = {
  id: Id<"observations">;
  title: string;
  severity: "new" | "read" | "done";
  familyName: string;
  familyId: Id<"families">;
  createdAt: number;
};

type UpcomingEvent = {
  id: Id<"events">;
  title: string;
  startAt: number;
  familyName: string;
  familyId: Id<"families">;
};

type Highlights = {
  totalPendingObservations: number;
  totalActiveMembers: number;
  activeFamilies: number;
  upcomingEventsCount: number;
  recentObservations: RecentObservation[];
  upcomingEvents: UpcomingEvent[];
  engagementBuckets: { active: number; stalled: number; idle: number };
};

// Aggregate roll-up across all families assigned to this advisor.
//
// Returns ONLY counts + curated preview lists; never returns full per-family
// rosters or raw resource listings.
export const crossFamilyHighlights = query({
  args: {},
  handler: async (ctx): Promise<Highlights> => {
    const { pairs } = await loadAdvisorAssignments(ctx);
    const now = Date.now();
    const activeCutoff = now - ACTIVE_WINDOW_MS;
    const stalledCutoff = now - STALLED_WINDOW_MS;
    const familyActivityCutoff = now - FAMILY_RECENT_ACTIVITY_MS;
    const upcomingEventCutoff = now + UPCOMING_EVENT_WINDOW_MS;

    let totalPendingObservations = 0;
    let upcomingEventsCount = 0;
    let activeFamilies = 0;

    const recentObsCandidates: RecentObservation[] = [];
    const upcomingEventCandidates: UpcomingEvent[] = [];

    // Distinct member id set across all assigned families. Members in
    // multiple families count once.
    const distinctMemberIds = new Set<string>();
    // Engagement signal: per member id, the latest `last_touched_at` across
    // any of their lessons in any assigned family.
    const lastTouchedByMember = new Map<string, number>();
    // Per family: did anything happen in the last 30 days?
    const familiesWithRecentActivity = new Set<string>();

    for (const { family } of pairs) {
      const familyId = family._id;
      const familyName = family.name;

      // --- Members ---------------------------------------------------------
      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect();
      const memberMembershipUserIds = memberships
        .filter((m) => m.role === "member" && m.lifecycle_status !== "suspended")
        .map((m) => m.user_id);
      for (const id of memberMembershipUserIds) distinctMemberIds.add(id);

      // --- Observations ----------------------------------------------------
      const obs = await ctx.db
        .query("observations")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect();
      const pending = obs.filter((o) => !o.deleted_at && o.status === "new");
      totalPendingObservations += pending.length;
      for (const o of pending) {
        recentObsCandidates.push({
          id: o._id,
          title: o.title,
          severity: o.status,
          familyName,
          familyId,
          createdAt: o._creationTime,
        });
      }

      // --- Events ----------------------------------------------------------
      const upcoming = await ctx.db
        .query("events")
        .withIndex("by_family_and_starts_at", (q) =>
          q.eq("family_id", familyId).gte("starts_at", now),
        )
        .collect();
      const inWindow = upcoming.filter(
        (e) => !e.deleted_at && e.starts_at <= upcomingEventCutoff,
      );
      upcomingEventsCount += inWindow.length;
      for (const e of inWindow) {
        upcomingEventCandidates.push({
          id: e._id,
          title: e.title,
          startAt: e.starts_at,
          familyName,
          familyId,
        });
      }

      // --- Family activity (threads in last 30d, OR recent observations) ---
      let familyActive = false;
      const threads = await ctx.db
        .query("threads")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect();
      for (const t of threads) {
        if (t.deleted_at) continue;
        const v = threadActivityAt(t);
        if (v >= familyActivityCutoff) {
          familyActive = true;
          break;
        }
      }
      if (!familyActive) {
        for (const o of obs) {
          if (!o.deleted_at && o._creationTime >= familyActivityCutoff) {
            familyActive = true;
            break;
          }
        }
      }
      if (familyActive) familiesWithRecentActivity.add(familyId);

      // --- Engagement (lesson_users.last_touched_at per member) -----------
      // Walk each assigned-family member's lesson_users rows and merge their
      // most recent touch timestamp into the cross-family map.
      for (const memberId of memberMembershipUserIds) {
        const rows = await ctx.db
          .query("lesson_users")
          .withIndex("by_user", (q) => q.eq("user_id", memberId))
          .collect();
        // Only consider rows scoped to this assigned family — never count
        // engagement signal from a family the advisor isn't assigned to.
        const scopedRows = rows.filter(
          (r) => r.family_id === familyId,
        );
        if (scopedRows.length === 0) continue;
        let latest = 0;
        for (const r of scopedRows) {
          const t = lessonTouchedAt(r);
          if (t > latest) latest = t;
        }
        const prev = lastTouchedByMember.get(memberId) ?? 0;
        if (latest > prev) lastTouchedByMember.set(memberId, latest);
      }
    }

    activeFamilies = familiesWithRecentActivity.size;

    // Engagement buckets are computed across the distinct-member set. Members
    // who exist in an assigned family but have never touched any lesson at
    // all are bucketed as "idle".
    let active = 0;
    let stalled = 0;
    let idle = 0;
    for (const memberId of distinctMemberIds) {
      const latest = lastTouchedByMember.get(memberId) ?? 0;
      if (latest >= activeCutoff) active += 1;
      else if (latest >= stalledCutoff) stalled += 1;
      else idle += 1;
    }

    recentObsCandidates.sort((a, b) => b.createdAt - a.createdAt);
    upcomingEventCandidates.sort((a, b) => a.startAt - b.startAt);

    return {
      totalPendingObservations,
      totalActiveMembers: active,
      activeFamilies,
      upcomingEventsCount,
      recentObservations: recentObsCandidates.slice(0, 5),
      upcomingEvents: upcomingEventCandidates.slice(0, 5),
      engagementBuckets: { active, stalled, idle },
    };
  },
});

// Soft variant of `assignedFamilies` used by the family-selector chip render
// gate. Returns an empty array (rather than throwing) when the caller is not
// an advisor, so the chip can decide whether to render without surfacing a
// ConvexError to the client.
export const assignedFamiliesSoft = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
      .unique();
    if (!user) return [];
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const advisorMemberships = memberships.filter(
      (m) => m.role === "advisor" && m.lifecycle_status !== "suspended",
    );
    if (advisorMemberships.length === 0) return [];
    const out: Array<{
      id: Id<"families">;
      name: string;
      memberCount: number;
      lastActivityAt: number;
      pendingObservationCount: number;
    }> = [];
    for (const m of advisorMemberships) {
      const family = (await ctx.db.get(m.family_id)) as Doc<"families"> | null;
      if (!family || family.deleted_at) continue;
      const fams = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", family._id))
        .collect();
      const memberCount = fams.filter((x) => x.role === "member").length;
      const threads = await ctx.db
        .query("threads")
        .withIndex("by_family", (q) => q.eq("family_id", family._id))
        .collect();
      let lastActivityAt = family._creationTime;
      for (const t of threads) {
        if (t.deleted_at) continue;
        const v = threadActivityAt(t);
        if (v > lastActivityAt) lastActivityAt = v;
      }
      const obs = await ctx.db
        .query("observations")
        .withIndex("by_family", (q) => q.eq("family_id", family._id))
        .collect();
      const pendingObservationCount = obs.filter(
        (o) => !o.deleted_at && o.status === "new",
      ).length;
      out.push({
        id: family._id,
        name: family.name,
        memberCount,
        lastActivityAt,
        pendingObservationCount,
      });
    }
    out.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    return out;
  },
});
