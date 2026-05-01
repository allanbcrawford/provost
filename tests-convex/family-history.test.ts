/// <reference types="vite/client" />
// Issue 6.2 — Family History timeline + Values statement.
//
// Verifies:
//   1. recordEvent inserts a row with the right fields
//   2. listEvents returns events ordered by occurred_at desc, scoped by family
//   3. updateValuesStatement updates the family row + writes audit
//   4. Cross-family isolation: advisor on family A cannot read or write to
//      family B's history / values

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily, type SeedFamily } from "./_helpers";
import { modules } from "./_modules";

let familyA: SeedFamily;
let familyB: SeedFamily;

function makeT() {
  return convexTest(schema, modules);
}

beforeEach(async () => {
  const t = makeT();
  familyA = await seedFamily(t, "FamilyA");
  familyB = await seedFamily(t, "FamilyB");
});

describe("familyHistory.recordEvent", () => {
  it("inserts a row with the expected fields", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    const id = await caller.mutation(api.familyHistory.recordEvent, {
      familyId: familyA.familyId,
      kind: "manual",
      title: "Quarterly review",
      description: "Q1 2026 alignment",
      occurredAt: 1_700_000_000_000,
    });
    expect(id).toBeDefined();
    const events = await caller.query(api.familyHistory.listEvents, {
      familyId: familyA.familyId,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "manual",
      title: "Quarterly review",
      description: "Q1 2026 alignment",
      occurred_at: 1_700_000_000_000,
    });
  });
});

describe("familyHistory.listEvents", () => {
  it("returns events in occurred_at desc order, scoped by family", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const callerA = asSubject(t, familyA.adminClerkSubject);
    const callerB = asSubject(t, familyB.adminClerkSubject);

    await callerA.mutation(api.familyHistory.recordEvent, {
      familyId: familyA.familyId,
      kind: "manual",
      title: "Old A",
      occurredAt: 1_000,
    });
    await callerA.mutation(api.familyHistory.recordEvent, {
      familyId: familyA.familyId,
      kind: "manual",
      title: "New A",
      occurredAt: 5_000,
    });
    await callerB.mutation(api.familyHistory.recordEvent, {
      familyId: familyB.familyId,
      kind: "manual",
      title: "B only",
      occurredAt: 3_000,
    });

    const eventsA = await callerA.query(api.familyHistory.listEvents, {
      familyId: familyA.familyId,
    });
    expect(eventsA.map((e) => e.title)).toEqual(["New A", "Old A"]);

    const eventsB = await callerB.query(api.familyHistory.listEvents, {
      familyId: familyB.familyId,
    });
    expect(eventsB.map((e) => e.title)).toEqual(["B only"]);
  });
});

describe("familyHistory.updateValuesStatement", () => {
  it("updates the family row and writes a values audit event", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await caller.mutation(api.familyHistory.updateValuesStatement, {
      familyId: familyA.familyId,
      statement: "We steward what we've been entrusted with.",
    });

    const result = await caller.query(api.familyHistory.getValuesStatement, {
      familyId: familyA.familyId,
    });
    expect(result.statement).toBe("We steward what we've been entrusted with.");
    expect(result.updated_at).toBeTypeOf("number");
    expect(result.updated_by_name).toContain("Admin");

    // Confirm an audit row landed.
    const audits = await t.run(async (ctx) => {
      return await ctx.db.query("audit_events").collect();
    });
    const valuesAudit = audits.find(
      (a) => a.action === "family.values.updated" && a.family_id === familyA.familyId,
    );
    expect(valuesAudit).toBeDefined();
  });
});

describe("familyHistory cross-family isolation", () => {
  async function assertForbidden(call: () => Promise<unknown>) {
    await expect(call()).rejects.toMatchObject({
      data: expect.objectContaining({ code: expect.stringMatching(/^FORBIDDEN/) }),
    });
  }

  it("rejects Family A admin reading Family B history", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const callerB = asSubject(t, familyB.adminClerkSubject);
    await callerB.mutation(api.familyHistory.recordEvent, {
      familyId: familyB.familyId,
      kind: "manual",
      title: "B secret",
    });

    const callerA = asSubject(t, familyA.adminClerkSubject);
    await assertForbidden(() =>
      callerA.query(api.familyHistory.listEvents, { familyId: familyB.familyId }),
    );
    await assertForbidden(() =>
      callerA.mutation(api.familyHistory.updateValuesStatement, {
        familyId: familyB.familyId,
        statement: "hijack",
      }),
    );
    await assertForbidden(() =>
      callerA.query(api.familyHistory.getValuesStatement, { familyId: familyB.familyId }),
    );
  });
});
