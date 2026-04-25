import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { completeLessonAndAdvance } from "./lessonDelivery";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

const DEFAULT_PASS_SCORE = 0.7;

export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) return null;
    await requireFamilyMember(ctx, lesson.family_id);
    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_lesson", (q) => q.eq("lesson_id", lessonId))
      .unique();
    if (!quiz) return null;
    // Strip the correct_choice_index out of the response so the client can't
    // cheat by reading the quiz JSON.
    return {
      _id: quiz._id,
      lesson_id: quiz.lesson_id,
      pass_score: quiz.pass_score,
      questions: quiz.questions.map((q) => ({
        prompt: q.prompt,
        choices: q.choices,
        explanation: q.explanation ?? null,
      })),
    };
  },
});

// Create or replace the quiz for a lesson. Admin/advisor only.
export const upsertForLesson = mutation({
  args: {
    lessonId: v.id("lessons"),
    passScore: v.optional(v.number()),
    questions: v.array(
      v.object({
        prompt: v.string(),
        choices: v.array(v.string()),
        correct_choice_index: v.number(),
        explanation: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || lesson.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, lesson.family_id, ["admin", "advisor"]);

    const passScore = args.passScore ?? DEFAULT_PASS_SCORE;
    const existing = await ctx.db
      .query("quizzes")
      .withIndex("by_lesson", (q) => q.eq("lesson_id", args.lessonId))
      .unique();
    let quizId: Id<"quizzes">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        pass_score: passScore,
        questions: args.questions,
      });
      quizId = existing._id;
    } else {
      quizId = await ctx.db.insert("quizzes", {
        lesson_id: args.lessonId,
        family_id: lesson.family_id,
        pass_score: passScore,
        questions: args.questions,
      });
    }
    await writeAudit(ctx, {
      familyId: lesson.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "quizzes.upsert",
      resourceType: "quizzes",
      resourceId: quizId,
      metadata: { lessonId: args.lessonId, questionCount: args.questions.length },
    });
    return quizId;
  },
});

// Submit answers and grade. Pass triggers delivery advance.
export const submitAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(v.number()),
  },
  handler: async (ctx, { quizId, answers }) => {
    const quiz = await ctx.db.get(quizId);
    if (!quiz) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, quiz.family_id);

    if (answers.length !== quiz.questions.length) {
      throw new ConvexError({
        code: "ANSWER_COUNT_MISMATCH",
        expected: quiz.questions.length,
        got: answers.length,
      });
    }
    let correct = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (answers[i] === quiz.questions[i]!.correct_choice_index) correct++;
    }
    const score = correct / Math.max(quiz.questions.length, 1);
    const passed = score >= quiz.pass_score;

    const attemptId: Id<"quiz_attempts"> = await ctx.db.insert("quiz_attempts", {
      quiz_id: quiz._id,
      lesson_id: quiz.lesson_id,
      user_id: user._id,
      family_id: quiz.family_id,
      answers,
      score,
      passed,
      submitted_at: Date.now(),
    });

    let activated: Id<"lessons">[] = [];
    if (passed) {
      const result = await completeLessonAndAdvance(ctx, {
        userId: user._id,
        lessonId: quiz.lesson_id,
      });
      activated = result.activated;
    }

    await writeAudit(ctx, {
      familyId: quiz.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: passed ? "quizzes.passed" : "quizzes.failed",
      resourceType: "quiz_attempts",
      resourceId: attemptId,
      metadata: { lessonId: quiz.lesson_id, score, passed },
    });

    return {
      attemptId,
      score,
      passed,
      activatedLessonIds: activated,
    };
  },
});

// Convenience: my latest attempts for a given lesson.
export const myAttempts = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.deleted_at) return [];
    const { user } = await requireFamilyMember(ctx, lesson.family_id);
    const rows = await ctx.db
      .query("quiz_attempts")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", user._id).eq("lesson_id", lessonId))
      .collect();
    rows.sort((a, b) => b.submitted_at - a.submitted_at);
    return rows.slice(0, 5).map(
      (
        r,
      ): {
        _id: Doc<"quiz_attempts">["_id"];
        score: number;
        passed: boolean;
        submitted_at: number;
      } => ({
        _id: r._id,
        score: r.score,
        passed: r.passed,
        submitted_at: r.submitted_at,
      }),
    );
  },
});
