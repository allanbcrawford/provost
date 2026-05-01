// Issue 7.1 — SOC 2 readiness: audit log coverage on sensitive mutations.
//
// These tests assert that representative mutations across the three categories
// flagged in the beta-parity plan write an `audit_events` row with the
// expected `action` string. The intent is to catch regressions where a future
// refactor accidentally drops the inline `writeAudit` call from one of the
// load-bearing surfaces.

import { convexTest } from "convex-test";
import type { GenericId } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

async function fetchAuditActions(
  t: ReturnType<typeof convexTest<typeof schema>>,
  familyId: GenericId<"families">,
): Promise<string[]> {
  return await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("audit_events")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    return rows.map((r) => r.action);
  });
}

describe("audit coverage — Issue 7.1", () => {
  it("family.createMember writes a family.create_member audit event", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);

    await asSubject(t, fam.adminClerkSubject).mutation(api.family.createMember, {
      familyId: fam.familyId,
      first_name: "New",
      last_name: "Member",
      email: `new-member-${Date.now()}@test.invalid`,
      generation: 2,
      role: "member",
      familyRole: "member",
    });

    const actions = await fetchAuditActions(t, fam.familyId);
    expect(actions).toContain("family.create_member");
  });

  it("observations.markDone writes an observations.approved audit event", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);

    const observationId = await t.run(async (ctx) => {
      const documentId = await ctx.db.insert("documents", {
        family_id: fam.familyId,
        name: "Doc",
        category: "estate",
        type: "trust",
        observation_type: "observation",
        observation_is_observed: false,
      });
      await ctx.db.insert("resource_parties", {
        family_id: fam.familyId,
        resource_type: "document",
        resource_id: documentId,
        user_id: fam.adminUserId,
        role: "owner",
        granted_by: fam.adminUserId,
        granted_at: Date.now(),
      });
      const obsId = await ctx.db.insert("observations", {
        family_id: fam.familyId,
        document_id: documentId,
        title: "obs",
        description: "d",
        why_this_matters: "w",
        recommendation: "r",
        next_best_actions: [],
        suggested_prompts: [],
        status: "new",
      });
      await ctx.db.insert("resource_parties", {
        family_id: fam.familyId,
        resource_type: "observation",
        resource_id: obsId,
        user_id: fam.adminUserId,
        role: "owner",
        granted_by: fam.adminUserId,
        granted_at: Date.now(),
      });
      return obsId;
    });

    await asSubject(t, fam.adminClerkSubject).mutation(api.observations.markDone, {
      observationId,
    });

    const actions = await fetchAuditActions(t, fam.familyId);
    expect(actions).toContain("observations.approved");
  });

  it("lessons.setLessonStatusForMember writes a lesson.status.advisor_override audit event", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);

    const lessonId = await t.run(async (ctx) => {
      const programId = await ctx.db.insert("programs", {
        family_id: fam.familyId,
        title: "Program",
        stewardship_phase: "emerging",
        sort_order: 0,
      });
      const trackId = await ctx.db.insert("tracks", {
        program_id: programId,
        family_id: fam.familyId,
        title: "Track",
        sort_order: 0,
      });
      return await ctx.db.insert("lessons", {
        family_id: fam.familyId,
        track_id: trackId,
        title: "Lesson",
        category: "education",
        content: "",
        sort_order: 0,
        format: "article",
        article_markdown: "Body",
      });
    });

    await asSubject(t, fam.adminClerkSubject).mutation(api.lessons.setLessonStatusForMember, {
      memberId: fam.memberUserId,
      lessonId,
      status: "complete",
    });

    const actions = await fetchAuditActions(t, fam.familyId);
    expect(actions).toContain("lesson.status.advisor_override");
  });
});
