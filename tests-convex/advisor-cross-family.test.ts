/// <reference types="vite/client" />
// Issue 6.1 — advisor cross-family aggregate queries.
//
// Three contracts under test:
//   1. assignedFamilies returns ONLY families this advisor is assigned to.
//   2. crossFamilyHighlights aggregates counts correctly across multiple
//      assigned families (and only those).
//   3. Negative isolation: an advisor assigned to family A cannot see any
//      family-B counts via these queries.

import { convexTest } from "convex-test";
import type { GenericId } from "convex/values";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily, type SeedFamily } from "./_helpers";
import { modules } from "./_modules";

function makeT() {
  return convexTest(schema, modules);
}

// Seed an advisor user and (optionally) attach them to families with
// `family_users.role === "advisor"`. Returns the clerk subject for use with
// `asSubject`.
async function seedAdvisor(
  t: ReturnType<typeof makeT>,
  attachTo: SeedFamily[],
  label = "Advisor",
) {
  const subject = `clerk-advisor-${Math.random().toString(36).slice(2, 8)}`;
  const advisorId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      first_name: label,
      last_name: "Test",
      email: `${subject}@test.invalid`,
      // users.role is admin | member globally — advisor identity is per-
      // family on family_users.role, inserted below.
      role: "member",
      generation: 1,
      clerk_user_id: subject,
      onboarding_status: "claimed",
    });
    for (const f of attachTo) {
      await ctx.db.insert("family_users", {
        family_id: f.familyId,
        user_id: id,
        role: "advisor",
        lifecycle_status: "active",
      });
    }
    return id;
  });
  return { subject, advisorId };
}

async function seedObservation(
  t: ReturnType<typeof makeT>,
  args: {
    familyId: GenericId<"families">;
    title: string;
    status: "new" | "read" | "done";
  },
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("observations", {
      family_id: args.familyId,
      title: args.title,
      description: "test",
      why_this_matters: "test",
      recommendation: "test",
      next_best_actions: [],
      suggested_prompts: [],
      status: args.status,
    });
  });
}

async function seedEvent(
  t: ReturnType<typeof makeT>,
  args: {
    familyId: GenericId<"families">;
    creatorId: GenericId<"users">;
    title: string;
    startsAt: number;
  },
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("events", {
      family_id: args.familyId,
      created_by: args.creatorId,
      title: args.title,
      starts_at: args.startsAt,
      ends_at: args.startsAt + 60 * 60 * 1000,
      location_type: "video",
    });
  });
}

let familyA: SeedFamily;
let familyB: SeedFamily;

beforeEach(async () => {
  const t = makeT();
  familyA = await seedFamily(t, "FamilyA");
  familyB = await seedFamily(t, "FamilyB");
});

describe("advisor.assignedFamilies", () => {
  it("returns only families the advisor is assigned to", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    // Attach advisor only to A; not to B.
    const { subject } = await seedAdvisor(t, [familyA]);

    const caller = asSubject(t, subject);
    const result = (await caller.query(api.advisor.assignedFamilies, {})) as Array<{
      id: string;
      name: string;
    }>;
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(familyA.familyId);
    expect(result.find((r) => r.id === (familyB.familyId as string))).toBeUndefined();
  });
});

describe("advisor.crossFamilyHighlights", () => {
  it("aggregates pending observations + upcoming events across assigned families", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const familyC = await seedFamily(t, "FamilyC"); // advisor NOT assigned

    const { subject } = await seedAdvisor(t, [familyA, familyB]);

    // Family A: 2 new observations, 1 done. Family B: 1 new. Family C: 5
    // new (must NOT be counted).
    await seedObservation(t, { familyId: familyA.familyId, title: "A1", status: "new" });
    await seedObservation(t, { familyId: familyA.familyId, title: "A2", status: "new" });
    await seedObservation(t, { familyId: familyA.familyId, title: "A3", status: "done" });
    await seedObservation(t, { familyId: familyB.familyId, title: "B1", status: "new" });
    for (let i = 0; i < 5; i++) {
      await seedObservation(t, { familyId: familyC.familyId, title: `C${i}`, status: "new" });
    }

    // 1 upcoming event in A (within 14d), 1 in B (within 14d), 1 in C
    // (must NOT be counted).
    const now = Date.now();
    await seedEvent(t, {
      familyId: familyA.familyId,
      creatorId: familyA.adminUserId,
      title: "EventA",
      startsAt: now + 24 * 60 * 60 * 1000,
    });
    await seedEvent(t, {
      familyId: familyB.familyId,
      creatorId: familyB.adminUserId,
      title: "EventB",
      startsAt: now + 3 * 24 * 60 * 60 * 1000,
    });
    await seedEvent(t, {
      familyId: familyC.familyId,
      creatorId: familyC.adminUserId,
      title: "EventC",
      startsAt: now + 24 * 60 * 60 * 1000,
    });

    const caller = asSubject(t, subject);
    const result = (await caller.query(api.advisor.crossFamilyHighlights, {})) as {
      totalPendingObservations: number;
      upcomingEventsCount: number;
      recentObservations: Array<{ familyId: string; title: string }>;
      upcomingEvents: Array<{ familyId: string; title: string }>;
      engagementBuckets: { active: number; stalled: number; idle: number };
    };

    // 2 (A) + 1 (B) = 3 pending; family C's 5 are excluded.
    expect(result.totalPendingObservations).toBe(3);
    // 1 (A) + 1 (B) = 2 upcoming; family C's event is excluded.
    expect(result.upcomingEventsCount).toBe(2);

    // No preview should reference family C.
    for (const o of result.recentObservations) {
      expect(o.familyId).not.toBe(familyC.familyId as string);
    }
    for (const e of result.upcomingEvents) {
      expect(e.familyId).not.toBe(familyC.familyId as string);
    }
  });
});

describe("advisor cross-family isolation", () => {
  it("rejects callers with zero advisor assignments", async () => {
    // A regular family member (no advisor membership) calling these queries
    // gets FORBIDDEN_ROLE — they cannot enumerate aggregates.
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await expect(
      caller.query(api.advisor.assignedFamilies, {}),
    ).rejects.toMatchObject({
      data: expect.objectContaining({ code: expect.stringMatching(/^FORBIDDEN/) }),
    });
    await expect(
      caller.query(api.advisor.crossFamilyHighlights, {}),
    ).rejects.toMatchObject({
      data: expect.objectContaining({ code: expect.stringMatching(/^FORBIDDEN/) }),
    });
  });

  it("advisor assigned only to family A cannot read family B aggregates", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const { subject } = await seedAdvisor(t, [familyA]);

    // Seed family B with a lot of pending observations + an event. None of
    // these should appear in the aggregate for an advisor only assigned to A.
    for (let i = 0; i < 7; i++) {
      await seedObservation(t, { familyId: familyB.familyId, title: `B${i}`, status: "new" });
    }
    const now = Date.now();
    await seedEvent(t, {
      familyId: familyB.familyId,
      creatorId: familyB.adminUserId,
      title: "BEvent",
      startsAt: now + 24 * 60 * 60 * 1000,
    });

    const caller = asSubject(t, subject);

    const list = (await caller.query(api.advisor.assignedFamilies, {})) as Array<{
      id: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(familyA.familyId);

    const agg = (await caller.query(api.advisor.crossFamilyHighlights, {})) as {
      totalPendingObservations: number;
      upcomingEventsCount: number;
      recentObservations: Array<{ familyId: string; title: string }>;
      upcomingEvents: Array<{ familyId: string }>;
    };
    // Zero counts because family A has no observations/events; family B is
    // intentionally invisible.
    expect(agg.totalPendingObservations).toBe(0);
    expect(agg.upcomingEventsCount).toBe(0);
    for (const o of agg.recentObservations) {
      expect(o.familyId).not.toBe(familyB.familyId as string);
    }
    for (const e of agg.upcomingEvents) {
      expect(e.familyId).not.toBe(familyB.familyId as string);
    }
  });
});
