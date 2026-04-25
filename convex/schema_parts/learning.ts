import { defineTable } from "convex/server";
import { v } from "convex/values";

// Stewardship phase. Drives program selection per-member.
const stewardshipPhase = v.union(
  v.literal("emerging"),
  v.literal("developing"),
  v.literal("operating"),
  v.literal("enduring"),
);

// Lesson assignment status (post-rebuild).
//   locked    — not yet unlocked; user can't start.
//   active    — one of the user's currently delivered lessons (max 2).
//   complete  — quiz passed.
//   advanced  — manually unlocked / fast-tracked by admin.
const lessonStatus = v.union(
  v.literal("locked"),
  v.literal("active"),
  v.literal("complete"),
  v.literal("advanced"),
  // Legacy values kept during migration so old rows validate. The migration
  // job rewrites them to the new vocabulary; new writes must use new values.
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("overdue"),
);

export const learningTables = {
  // Programs are family-scoped containers for a stewardship phase. A family
  // typically has one program per phase (4 total for a fully populated tree).
  programs: defineTable({
    family_id: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    stewardship_phase: stewardshipPhase,
    sort_order: v.number(),
    deleted_at: v.optional(v.number()),
  })
    .index("by_family", ["family_id"])
    .index("by_family_and_phase", ["family_id", "stewardship_phase"]),

  // Tracks group lessons within a program. PRD targets ~5 per program.
  tracks: defineTable({
    program_id: v.id("programs"),
    family_id: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    sort_order: v.number(),
    deleted_at: v.optional(v.number()),
  })
    .index("by_program", ["program_id"])
    .index("by_family", ["family_id"]),

  // Quiz attached to a lesson. One quiz per lesson; passing it unlocks the
  // next lesson in the track.
  quizzes: defineTable({
    lesson_id: v.id("lessons"),
    family_id: v.id("families"),
    pass_score: v.number(), // e.g. 0.7 means 70% correct required
    questions: v.array(
      v.object({
        prompt: v.string(),
        choices: v.array(v.string()),
        correct_choice_index: v.number(),
        explanation: v.optional(v.string()),
      }),
    ),
  }).index("by_lesson", ["lesson_id"]),

  quiz_attempts: defineTable({
    quiz_id: v.id("quizzes"),
    lesson_id: v.id("lessons"),
    user_id: v.id("users"),
    family_id: v.id("families"),
    answers: v.array(v.number()),
    score: v.number(), // 0..1
    passed: v.boolean(),
    submitted_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_and_lesson", ["user_id", "lesson_id"])
    .index("by_lesson", ["lesson_id"]),

  // User-saved lessons.
  lesson_bookmarks: defineTable({
    user_id: v.id("users"),
    lesson_id: v.id("lessons"),
    family_id: v.id("families"),
    created_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_and_lesson", ["user_id", "lesson_id"]),

  // Thumbs / comments on a lesson.
  lesson_feedback: defineTable({
    user_id: v.id("users"),
    lesson_id: v.id("lessons"),
    family_id: v.id("families"),
    kind: v.union(v.literal("thumbs_up"), v.literal("thumbs_down"), v.literal("comment")),
    body: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_lesson", ["lesson_id"])
    .index("by_user", ["user_id"]),
};

// Re-exported so domain.ts can compose it into the lessons table extension
// without importing the full union construction inline.
export const learningStatusValidator = lessonStatus;
