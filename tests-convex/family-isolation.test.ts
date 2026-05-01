/// <reference types="vite/client" />
// SOC 2 — Issue 1.3: Cross-family data isolation
//
// Every test authenticates as a member of Family A and attempts to access
// Family B's resources. The assertion is always a ConvexError with code
// "FORBIDDEN". A paired positive-control test proves the same call succeeds
// when scoped to Family A, so failures here are genuine isolation breaks, not
// unrelated infrastructure errors.

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedDocument, seedFamily, type SeedFamily } from "./_helpers";
import { modules } from "./_modules";

// ---------------------------------------------------------------------------
// Shared state — re-seeded before every test for full isolation.
// ---------------------------------------------------------------------------

let familyA: SeedFamily;
let familyB: SeedFamily;

// convexTest() creates an ephemeral in-memory DB; we construct a fresh one
// inside each test so there is zero state leakage between cases.
function makeT() {
  return convexTest(schema, modules);
}

// Re-seed before every test so each case gets clean, independent IDs.
beforeEach(async () => {
  const t = makeT();
  familyA = await seedFamily(t, "FamilyA");
  familyB = await seedFamily(t, "FamilyB");
});

// ---------------------------------------------------------------------------
// Helper — assert that a ConvexError with code FORBIDDEN (or FORBIDDEN_*)
// is thrown, matching what requireFamilyMember throws when the caller has
// no membership row in the target family.
// ---------------------------------------------------------------------------
async function assertForbidden(call: () => Promise<unknown>) {
  await expect(call()).rejects.toMatchObject({
    data: expect.objectContaining({ code: expect.stringMatching(/^FORBIDDEN/) }),
  });
}

// ===========================================================================
// 1. family.getGraph — reads the family member graph
// ===========================================================================
describe("family.getGraph cross-family isolation", () => {
  it("rejects Family A member reading Family B graph", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await assertForbidden(() => caller.query(api.family.getGraph, { familyId: familyB.familyId }));
  });

  it("[positive] Family A member can read their own graph", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    const result = await caller.query(api.family.getGraph, { familyId: familyA.familyId });
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// 2. documents.list — lists documents for a family
// ===========================================================================
describe("documents.list cross-family isolation", () => {
  it("rejects Family A member listing Family B documents", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await assertForbidden(() =>
      caller.query(api.documents.list, { familyId: familyB.familyId, category: "estate" }),
    );
  });

  it("[positive] Family A member can list their own documents", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    const result = await caller.query(api.documents.list, {
      familyId: familyA.familyId,
      category: "estate",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// 3. observations.listByFamily — high-sensitivity estate observations
// ===========================================================================
describe("observations.listByFamily cross-family isolation", () => {
  it("rejects Family A member reading Family B observations", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await assertForbidden(() =>
      caller.query(api.observations.listByFamily, { familyId: familyB.familyId }),
    );
  });

  it("[positive] Family A member can list their own observations", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    const result = await caller.query(api.observations.listByFamily, {
      familyId: familyA.familyId,
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// 4. governance.auditEvents — admin-only, high-sensitivity audit log
// ===========================================================================
describe("governance.auditEvents cross-family isolation", () => {
  it("rejects Family A admin reading Family B audit log", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await assertForbidden(() =>
      caller.query(api.governance.auditEvents, {
        familyId: familyB.familyId,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    );
  });

  it("[positive] Family A admin can read their own audit log", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    const result = await caller.query(api.governance.auditEvents, {
      familyId: familyA.familyId,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result).toHaveProperty("page");
  });
});

// ===========================================================================
// 5. lessons.list — lesson roster
// ===========================================================================
describe("lessons.list cross-family isolation", () => {
  it("rejects Family A member listing Family B lessons", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await assertForbidden(() =>
      caller.query(api.lessons.list, { familyId: familyB.familyId }),
    );
  });

  it("[positive] Family A member can list their own lessons", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    const result = await caller.query(api.lessons.list, { familyId: familyA.familyId });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// 6. lessons.myActiveLessons — per-user active lesson progress
// ===========================================================================
describe("lessons.myActiveLessons cross-family isolation", () => {
  it("rejects Family A member reading Family B active lessons", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await assertForbidden(() =>
      caller.query(api.lessons.myActiveLessons, { familyId: familyB.familyId }),
    );
  });

  it("[positive] Family A member can read their own active lessons", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    const result = await caller.query(api.lessons.myActiveLessons, {
      familyId: familyA.familyId,
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// 7. messages.listInbox — message inbox (cross-family thread read)
// ===========================================================================
describe("messages.listInbox cross-family isolation", () => {
  it("rejects Family A member reading Family B inbox", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await assertForbidden(() =>
      caller.query(api.messages.listInbox, { familyId: familyB.familyId }),
    );
  });

  it("[positive] Family A member can read their own inbox", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    const result = await caller.query(api.messages.listInbox, { familyId: familyA.familyId });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// 8. messages.sendMessage — mutation: send a message into Family B's context
// ===========================================================================
describe("messages.sendMessage cross-family isolation", () => {
  it("rejects Family A member sending a message in Family B context", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.memberClerkSubject);
    await assertForbidden(() =>
      caller.mutation(api.messages.sendMessage, {
        familyId: familyB.familyId,
        body: "should be rejected",
      }),
    );
  });

  it("[positive] Family A member can send a message in their own context", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.memberClerkSubject);
    // sendMessage returns { messageId, threadId }
    const result = await caller.mutation(api.messages.sendMessage, {
      familyId: familyA.familyId,
      recipientUserIds: [familyA.adminUserId],
      subject: "Hello",
      body: "Test message",
    });
    expect(result).toMatchObject({ messageId: expect.any(String), threadId: expect.any(String) });
  });
});

// ===========================================================================
// 9. family.updateMember — mutation: attempt to modify a member in Family B
// ===========================================================================
describe("family.updateMember cross-family isolation", () => {
  it("rejects Family A admin patching a member in Family B", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    familyB = await seedFamily(t, "FamilyB");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await assertForbidden(() =>
      caller.mutation(api.family.updateMember, {
        familyId: familyB.familyId,
        memberId: familyB.memberUserId,
        patch: { generation: 99 },
      }),
    );
  });

  it("[positive] Family A admin can patch their own member", async () => {
    const t = makeT();
    familyA = await seedFamily(t, "FamilyA");
    const caller = asSubject(t, familyA.adminClerkSubject);
    await expect(
      caller.mutation(api.family.updateMember, {
        familyId: familyA.familyId,
        memberId: familyA.memberUserId,
        patch: { generation: 3 },
      }),
    ).resolves.not.toThrow();
  });
});
