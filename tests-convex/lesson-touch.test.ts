// Item 5.5.4: verify the denormalized `last_touched_at` column on
// `lesson_users` is bumped on member-driven write paths but NOT on advisor
// overrides. Replaces the approximation that `memberLessonRollup` previously
// used (max of _creationTime, quiz_passed_at, last quiz attempt) — the new
// field captures reading-only progress (slide-index updates) too.

import { convexTest } from "convex-test";
import type { GenericId } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

async function seedSingleLesson(
  t: ReturnType<typeof convexTest<typeof schema>>,
  familyId: GenericId<"families">,
): Promise<{ lessonId: GenericId<"lessons"> }> {
  return await t.run(async (ctx) => {
    const programId = await ctx.db.insert("programs", {
      family_id: familyId,
      title: "Emerging program",
      stewardship_phase: "emerging",
      sort_order: 0,
    });
    const trackId = await ctx.db.insert("tracks", {
      program_id: programId,
      family_id: familyId,
      title: "Track A",
      sort_order: 0,
    });
    const lessonId = await ctx.db.insert("lessons", {
      family_id: familyId,
      track_id: trackId,
      title: "Lesson A1",
      category: "education",
      content: "",
      sort_order: 0,
      format: "article",
      article_markdown: "Body",
    });
    return { lessonId };
  });
}

describe("lesson_users.last_touched_at — Item 5.5.4", () => {
  it("recordSlideIndex bumps last_touched_at on the lesson_users row", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const { lessonId } = await seedSingleLesson(t, fam.familyId);
    const member = asSubject(t, fam.memberClerkSubject);

    const before = Date.now();
    const lessonUserId = await member.mutation(api.lessons.recordSlideIndex, {
      lessonId,
      slideIndex: 1,
    });

    const inserted = await t.run((ctx) => ctx.db.get(lessonUserId));
    expect(typeof inserted?.last_touched_at).toBe("number");
    expect(inserted?.last_touched_at as number).toBeGreaterThanOrEqual(before);

    // Subsequent slide-index update on the existing row also bumps it forward.
    // Wait at least 1ms to make the comparison meaningful even if the test
    // runner is fast.
    await new Promise((resolve) => setTimeout(resolve, 2));
    const beforeSecond = Date.now();
    await member.mutation(api.lessons.recordSlideIndex, {
      lessonId,
      slideIndex: 2,
    });

    const afterSecond = await t.run((ctx) => ctx.db.get(lessonUserId));
    expect(afterSecond?.last_touched_at as number).toBeGreaterThanOrEqual(
      beforeSecond,
    );
    expect(afterSecond?.last_touched_at as number).toBeGreaterThanOrEqual(
      inserted?.last_touched_at as number,
    );
  });

  it("setLessonStatusForMember (advisor override) does NOT bump last_touched_at", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const { lessonId } = await seedSingleLesson(t, fam.familyId);
    const admin = asSubject(t, fam.adminClerkSubject);
    const member = asSubject(t, fam.memberClerkSubject);

    // Member touches first so a row exists with a known last_touched_at.
    const lessonUserId = await member.mutation(api.lessons.recordSlideIndex, {
      lessonId,
      slideIndex: 1,
    });
    const afterMemberTouch = await t.run((ctx) => ctx.db.get(lessonUserId));
    const memberTouchedAt = afterMemberTouch?.last_touched_at as number;
    expect(typeof memberTouchedAt).toBe("number");

    // Wait, then advisor-overrides the status. last_touched_at must NOT move.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await admin.mutation(api.lessons.setLessonStatusForMember, {
      memberId: fam.memberUserId,
      lessonId,
      status: "complete",
    });

    const afterOverride = await t.run((ctx) => ctx.db.get(lessonUserId));
    expect(afterOverride?.status).toBe("complete");
    // The user themselves did not touch the lesson; last_touched_at frozen.
    expect(afterOverride?.last_touched_at).toBe(memberTouchedAt);
  });
});
