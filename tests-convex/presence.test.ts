import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

describe("presence — Issue 6.5", () => {
  it("heartbeat upserts: insert on first call, patch on second", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const member = asSubject(t, fam.memberClerkSubject);

    const first = await member.mutation(api.presence.heartbeat, {
      familyId: fam.familyId,
      surface: "/home",
    });
    expect(first.action).toBe("inserted");

    const second = await member.mutation(api.presence.heartbeat, {
      familyId: fam.familyId,
      surface: "/lessons",
    });
    expect(second.action).toBe("patched");
    expect(second.presenceId).toBe(first.presenceId);

    // Confirm one row only — heartbeat must not double-insert.
    const rows = await t.run((ctx) =>
      ctx.db
        .query("presence")
        .withIndex("by_user", (q) => q.eq("user_id", fam.memberUserId))
        .collect(),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]?.surface).toBe("/lessons");
  });

  it("listActive filters by withinSeconds — only fresh rows returned", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const now = Date.now();

    // Member has a fresh heartbeat; otherMember's heartbeat is stale (5 min
    // old). With the default 60s window, only `member` should appear.
    await t.run(async (ctx) => {
      await ctx.db.insert("presence", {
        user_id: fam.memberUserId,
        last_seen_at: now - 10_000, // 10s ago — fresh
        family_id: fam.familyId,
        surface: "/home",
      });
      await ctx.db.insert("presence", {
        user_id: fam.otherMemberUserId,
        last_seen_at: now - 5 * 60_000, // 5 min ago — stale
        family_id: fam.familyId,
        surface: "/home",
      });
    });

    const admin = asSubject(t, fam.adminClerkSubject);
    const active = await admin.query(api.presence.listActive, {
      familyId: fam.familyId,
      withinSeconds: 60,
    });

    const userIds = active.map((r) => r.userId);
    expect(userIds).toContain(fam.memberUserId);
    expect(userIds).not.toContain(fam.otherMemberUserId);
  });

  it("isolation: advisor on family A sees A's roster + cross-family advisors on A; never sees family B's users", async () => {
    const t = convexTest(schema, modules);
    const famA = await seedFamily(t, "FamA");
    const famB = await seedFamily(t, "FamB");

    // Mint an advisor user who is assigned to BOTH families. This models the
    // cross-family advisor case in the acceptance criteria.
    const advisorClerkSubject = `clerk-advisor-cross-${Date.now()}`;
    const advisorUserId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        first_name: "Cross",
        last_name: "Advisor",
        email: `advisor-${Date.now()}@test.invalid`,
        role: "member",
        generation: 1,
        clerk_user_id: advisorClerkSubject,
        onboarding_status: "claimed",
      });
      await ctx.db.insert("family_users", {
        family_id: famA.familyId,
        user_id: userId,
        role: "advisor",
      });
      await ctx.db.insert("family_users", {
        family_id: famB.familyId,
        user_id: userId,
        role: "advisor",
      });
      return userId;
    });

    // Heartbeats: famA's member, famB's member, and the cross-family advisor
    // are all currently active. famA's admin is querying.
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("presence", {
        user_id: famA.memberUserId,
        last_seen_at: now - 5_000,
        family_id: famA.familyId,
      });
      await ctx.db.insert("presence", {
        user_id: famB.memberUserId,
        last_seen_at: now - 5_000,
        family_id: famB.familyId,
      });
      await ctx.db.insert("presence", {
        user_id: advisorUserId,
        last_seen_at: now - 5_000,
        family_id: famA.familyId,
      });
    });

    const adminA = asSubject(t, famA.adminClerkSubject);
    const activeA = await adminA.query(api.presence.listActive, {
      familyId: famA.familyId,
      withinSeconds: 60,
    });

    const userIdsA = activeA.map((r) => r.userId);
    // Includes famA's member + cross-family advisor assigned to A.
    expect(userIdsA).toContain(famA.memberUserId);
    expect(userIdsA).toContain(advisorUserId);
    // Never includes famB's member.
    expect(userIdsA).not.toContain(famB.memberUserId);

    // And famA's admin cannot query famB at all (FORBIDDEN).
    await expect(
      adminA.query(api.presence.listActive, {
        familyId: famB.familyId,
        withinSeconds: 60,
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });
});
