// Locks in the "2 active lessons at a time" cadence behavior described by
// PRD §16 / Issue 3.4. Seeds a member with one program containing two
// tracks (3 + 2 lessons = 5 total), exercises:
//   1. Initial state → first 2 lessons of track 1 are active.
//   2. Quiz pass on lesson 1 → lesson 3 becomes active.
//   3. Quiz fail on lesson 2 → no advancement.
//   4. Quiz pass on lesson 2 → lesson 4 (first of track 2) becomes active,
//      proving cross-track unlock works.
//
// Each step also asserts `myActiveLessons` returns exactly 2 entries, the
// hard cap that the bento "2 new lessons" copy depends on.

import { convexTest } from "convex-test";
import type { GenericId } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

type LessonId = GenericId<"lessons">;

async function seedFiveLessonCurriculum(
  t: ReturnType<typeof convexTest<typeof schema>>,
  args: {
    familyId: GenericId<"families">;
    memberId: GenericId<"users">;
  },
): Promise<{
  lessonIds: [LessonId, LessonId, LessonId, LessonId, LessonId];
  quizIds: [
    GenericId<"quizzes">,
    GenericId<"quizzes">,
    GenericId<"quizzes">,
    GenericId<"quizzes">,
    GenericId<"quizzes">,
  ];
}> {
  return await t.run(async (ctx) => {
    // Mark the member's stewardship_phase so advanceLearner can find a program.
    await ctx.db.patch(args.memberId, { stewardship_phase: "emerging" });

    const programId = await ctx.db.insert("programs", {
      family_id: args.familyId,
      title: "Emerging program",
      stewardship_phase: "emerging",
      sort_order: 0,
    });
    const trackAId = await ctx.db.insert("tracks", {
      program_id: programId,
      family_id: args.familyId,
      title: "Track A",
      sort_order: 0,
    });
    const trackBId = await ctx.db.insert("tracks", {
      program_id: programId,
      family_id: args.familyId,
      title: "Track B",
      sort_order: 1,
    });

    async function makeLesson(
      trackId: GenericId<"tracks">,
      title: string,
      sortOrder: number,
    ): Promise<{ lessonId: LessonId; quizId: GenericId<"quizzes"> }> {
      const lessonId = await ctx.db.insert("lessons", {
        family_id: args.familyId,
        track_id: trackId,
        title,
        category: "education",
        content: "",
        sort_order: sortOrder,
        format: "article",
        article_markdown: title,
      });
      const quizId = await ctx.db.insert("quizzes", {
        lesson_id: lessonId,
        family_id: args.familyId,
        pass_score: 0.5,
        questions: [
          {
            prompt: "Pick the right answer",
            choices: ["wrong", "right"],
            correct_choice_index: 1,
          },
        ],
      });
      return { lessonId, quizId };
    }

    const a1 = await makeLesson(trackAId, "A1", 0);
    const a2 = await makeLesson(trackAId, "A2", 1);
    const a3 = await makeLesson(trackAId, "A3", 2);
    const b1 = await makeLesson(trackBId, "B1", 0);
    const b2 = await makeLesson(trackBId, "B2", 1);

    return {
      lessonIds: [a1.lessonId, a2.lessonId, a3.lessonId, b1.lessonId, b2.lessonId],
      quizIds: [a1.quizId, a2.quizId, a3.quizId, b1.quizId, b2.quizId],
    };
  });
}

describe("lesson delivery cadence — 2-at-a-time + quiz-pass advance", () => {
  it("activates first 2 lessons, advances on quiz pass, holds on quiz fail, crosses tracks", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const { lessonIds, quizIds } = await seedFiveLessonCurriculum(t, {
      familyId: fam.familyId,
      memberId: fam.memberUserId,
    });
    const [a1Id, a2Id, a3Id, b1Id /* b2Id unused below */] = lessonIds;
    const [, a2QuizId, , , b2QuizId] = quizIds;

    const member = asSubject(t, fam.memberClerkSubject);

    // Step 1: nothing has activated yet — myActiveLessons returns 0 until
    // ensureInitialActive (the mutation Education's first render fires) runs.
    await member.mutation(api.lessons.ensureInitialActive, { familyId: fam.familyId });
    let active = await member.query(api.lessons.myActiveLessons, { familyId: fam.familyId });
    expect(active.length).toBe(2);
    expect(active.map((l) => l._id).sort()).toEqual([a1Id, a2Id].sort());

    // Step 2: pass lesson 1's quiz. completeLessonAndAdvance should mark A1
    // complete and promote A3 into the active queue. A2 stays active.
    const a1QuizId = quizIds[0];
    await member.mutation(api.quizzes.submitAttempt, {
      quizId: a1QuizId,
      answers: [1], // correct
    });
    active = await member.query(api.lessons.myActiveLessons, { familyId: fam.familyId });
    expect(active.length).toBe(2);
    expect(active.map((l) => l._id).sort()).toEqual([a2Id, a3Id].sort());

    // Step 3: fail lesson 2's quiz. A2 must stay active and the queue
    // must not advance.
    await member.mutation(api.quizzes.submitAttempt, {
      quizId: a2QuizId,
      answers: [0], // wrong
    });
    active = await member.query(api.lessons.myActiveLessons, { familyId: fam.familyId });
    expect(active.length).toBe(2);
    expect(active.map((l) => l._id).sort()).toEqual([a2Id, a3Id].sort());

    // Step 4: pass A2's quiz. A2 → complete; A3 stays active; B1 (first of
    // track B) gets promoted, proving cross-track unlock.
    await member.mutation(api.quizzes.submitAttempt, {
      quizId: a2QuizId,
      answers: [1],
    });
    active = await member.query(api.lessons.myActiveLessons, { familyId: fam.familyId });
    expect(active.length).toBe(2);
    expect(active.map((l) => l._id).sort()).toEqual([a3Id, b1Id].sort());

    // Sanity: passing a quiz for a lesson that isn't active yet (B2)
    // is still allowed by submitAttempt (no gating there today), but it
    // should not double-promote — keep myActiveLessons at the cap.
    await member.mutation(api.quizzes.submitAttempt, {
      quizId: b2QuizId,
      answers: [1],
    });
    active = await member.query(api.lessons.myActiveLessons, { familyId: fam.familyId });
    expect(active.length).toBeLessThanOrEqual(2);
  });

  it("setLessonStatusForMember requires advisor/admin role and writes audit", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const { lessonIds } = await seedFiveLessonCurriculum(t, {
      familyId: fam.familyId,
      memberId: fam.memberUserId,
    });
    const targetLesson = lessonIds[2];

    // A plain member calling the override mutation must be rejected.
    const member = asSubject(t, fam.memberClerkSubject);
    await expect(
      member.mutation(api.lessons.setLessonStatusForMember, {
        memberId: fam.memberUserId,
        lessonId: targetLesson,
        status: "advanced",
      }),
    ).rejects.toThrow();

    // An admin can fast-forward the member to `advanced`.
    const admin = asSubject(t, fam.adminClerkSubject);
    const result = await admin.mutation(api.lessons.setLessonStatusForMember, {
      memberId: fam.memberUserId,
      lessonId: targetLesson,
      status: "advanced",
    });
    expect(result.after).toBe("advanced");

    // Audit row must exist tagged with the override action.
    const auditRows = await t.run(async (ctx) =>
      ctx.db
        .query("audit_events")
        .filter((q) => q.eq(q.field("action"), "lesson.status.advisor_override"))
        .collect(),
    );
    expect(auditRows.length).toBe(1);
    expect(auditRows[0]?.resource_id).toBe(targetLesson);
  });
});
