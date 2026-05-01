// Issue 5.4 follow-up: verify the denormalized `last_message_at` column on
// threads is patched whenever a message is appended, and that
// `recentThreads` orders by it (with `_creationTime` fallback).

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

describe("thread last_message_at + recentThreads ordering", () => {
  it("threads.addMessages bumps last_message_at on the parent thread", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const admin = asSubject(t, fam.adminClerkSubject);

    const { threadId } = await admin.mutation(api.threads.create, {
      familyId: fam.familyId,
      title: "T1",
      kind: "side_rail",
    });

    const before = await t.run((ctx) => ctx.db.get(threadId));
    expect(before?.last_message_at).toBeUndefined();

    const beforeAppend = Date.now();
    await admin.mutation(api.threads.addMessages, {
      threadId,
      messages: [{ role: "user", content: "hello" }],
    });

    const after = await t.run((ctx) => ctx.db.get(threadId));
    expect(typeof after?.last_message_at).toBe("number");
    expect(after?.last_message_at as number).toBeGreaterThanOrEqual(beforeAppend);
  });

  it("recentThreads sorts by last_message_at (resumed thread bubbles to top)", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const admin = asSubject(t, fam.adminClerkSubject);

    // Create thread A first, then B. Without last_message_at they'd sort B, A
    // by _creationTime desc. Append a message to A so it becomes most recent.
    const { threadId: a } = await admin.mutation(api.threads.create, {
      familyId: fam.familyId,
      title: "A",
      kind: "side_rail",
    });
    const { threadId: b } = await admin.mutation(api.threads.create, {
      familyId: fam.familyId,
      title: "B",
      kind: "side_rail",
    });

    // Sanity: B is newer by creation time.
    const beforeAppend = await admin.query(api.threads.recentThreads, {
      familyId: fam.familyId,
    });
    expect(beforeAppend.map((r) => r.id)).toEqual([b, a]);

    // Resume A by appending — A should now bubble above B.
    await admin.mutation(api.threads.addMessages, {
      threadId: a,
      messages: [{ role: "user", content: "ping" }],
    });

    const afterAppend = await admin.query(api.threads.recentThreads, {
      familyId: fam.familyId,
    });
    expect(afterAppend.map((r) => r.id)).toEqual([a, b]);
  });

  it("threads with no last_message_at fall back to _creationTime ordering", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const admin = asSubject(t, fam.adminClerkSubject);

    // Two threads, neither receives a message — pure _creationTime fallback.
    const { threadId: a } = await admin.mutation(api.threads.create, {
      familyId: fam.familyId,
      title: "A",
      kind: "side_rail",
    });
    const { threadId: b } = await admin.mutation(api.threads.create, {
      familyId: fam.familyId,
      title: "B",
      kind: "side_rail",
    });

    const rows = await admin.query(api.threads.recentThreads, {
      familyId: fam.familyId,
    });
    // B is newest by creation, so it leads.
    expect(rows.map((r) => r.id)).toEqual([b, a]);
  });
});
