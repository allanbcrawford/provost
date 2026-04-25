// Deterministic, rule-based lesson delivery. PRD specifies "2 active lessons
// at a time" and that selection logic must be auditable (no ML).
//
// Rules:
//   1. For a given user in a family, find their stewardship_phase. If unset,
//      no advancement happens (advisor must set it during onboarding).
//   2. Identify the program for that phase (one per family per phase).
//   3. Walk tracks in sort_order; within each track, walk lessons in sort_order.
//   4. Maintain at most 2 lessons in `active` status for the user. When fewer
//      than 2 are active, promote the next earliest-ordered `locked` lesson.
//   5. Promote happens on quiz pass (lesson → complete) and on a fresh
//      `ensureInitialActive` call (e.g. after onboarding).
//
// This file exposes internal mutation entry points; quizzes.ts and lessons.ts
// call these to keep delivery state consistent.

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ACTIVE_LIMIT = 2;

type ActiveStatus = "locked" | "active" | "complete" | "advanced";

function isActiveLike(status: string): boolean {
  return status === "active" || status === "assigned" || status === "in_progress";
}

function isCompleteLike(status: string): boolean {
  return status === "complete" || status === "completed" || status === "advanced";
}

async function loadOrderedLessonsForPhase(
  ctx: QueryCtx | MutationCtx,
  familyId: Id<"families">,
  phase: Doc<"users">["stewardship_phase"],
): Promise<Doc<"lessons">[]> {
  if (!phase) return [];
  const programs = await ctx.db
    .query("programs")
    .withIndex("by_family_and_phase", (q) =>
      q.eq("family_id", familyId).eq("stewardship_phase", phase),
    )
    .collect();
  const livePrograms = programs.filter((p) => !p.deleted_at);
  livePrograms.sort((a, b) => a.sort_order - b.sort_order);

  const lessons: Doc<"lessons">[] = [];
  for (const program of livePrograms) {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_program", (q) => q.eq("program_id", program._id))
      .collect();
    const liveTracks = tracks.filter((t) => !t.deleted_at);
    liveTracks.sort((a, b) => a.sort_order - b.sort_order);

    for (const track of liveTracks) {
      const trackLessons = await ctx.db
        .query("lessons")
        .withIndex("by_track", (q) => q.eq("track_id", track._id))
        .collect();
      trackLessons
        .filter((l) => !l.deleted_at)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      lessons.push(...trackLessons);
    }
  }
  return lessons;
}

async function ensureLessonUserRow(
  ctx: MutationCtx,
  args: {
    lesson: Doc<"lessons">;
    userId: Id<"users">;
    initialStatus: ActiveStatus;
  },
): Promise<Doc<"lesson_users">> {
  const existing = await ctx.db
    .query("lesson_users")
    .withIndex("by_user_and_lesson", (q) =>
      q.eq("user_id", args.userId).eq("lesson_id", args.lesson._id),
    )
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("lesson_users", {
    lesson_id: args.lesson._id,
    user_id: args.userId,
    family_id: args.lesson.family_id,
    status: args.initialStatus,
    slide_index: 0,
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("failed to materialize lesson_users row");
  return row;
}

// Advances delivery state for a user. Promotes locked lessons to active until
// ACTIVE_LIMIT is reached. Idempotent: safe to call repeatedly.
export async function advanceLearner(
  ctx: MutationCtx,
  args: { userId: Id<"users">; familyId: Id<"families"> },
): Promise<{ activated: Id<"lessons">[]; activeCount: number }> {
  const user = await ctx.db.get(args.userId);
  if (!user) return { activated: [], activeCount: 0 };
  const phase = user.stewardship_phase;
  if (!phase) return { activated: [], activeCount: 0 };

  const orderedLessons = await loadOrderedLessonsForPhase(ctx, args.familyId, phase);
  if (orderedLessons.length === 0) return { activated: [], activeCount: 0 };

  // Hydrate per-lesson status from lesson_users rows.
  const userRows = new Map<Id<"lessons">, Doc<"lesson_users">>();
  for (const l of orderedLessons) {
    const row = await ctx.db
      .query("lesson_users")
      .withIndex("by_user_and_lesson", (q) => q.eq("user_id", args.userId).eq("lesson_id", l._id))
      .unique();
    if (row) userRows.set(l._id, row);
  }

  let activeCount = 0;
  for (const l of orderedLessons) {
    const row = userRows.get(l._id);
    if (row && isActiveLike(row.status)) activeCount++;
  }

  const activated: Id<"lessons">[] = [];
  for (const l of orderedLessons) {
    if (activeCount >= ACTIVE_LIMIT) break;
    const row = userRows.get(l._id);
    if (row && (isActiveLike(row.status) || isCompleteLike(row.status))) continue;
    if (row) {
      await ctx.db.patch(row._id, { status: "active" });
    } else {
      await ensureLessonUserRow(ctx, {
        lesson: l,
        userId: args.userId,
        initialStatus: "active",
      });
    }
    activated.push(l._id);
    activeCount++;
  }
  return { activated, activeCount };
}

// Mark a lesson `complete` for a user (on quiz pass) and advance delivery.
export async function completeLessonAndAdvance(
  ctx: MutationCtx,
  args: { userId: Id<"users">; lessonId: Id<"lessons"> },
): Promise<{ activated: Id<"lessons">[] }> {
  const lesson = await ctx.db.get(args.lessonId);
  if (!lesson || lesson.deleted_at) return { activated: [] };

  const row = await ctx.db
    .query("lesson_users")
    .withIndex("by_user_and_lesson", (q) =>
      q.eq("user_id", args.userId).eq("lesson_id", args.lessonId),
    )
    .unique();
  if (row) {
    await ctx.db.patch(row._id, {
      status: "complete",
      quiz_passed_at: Date.now(),
    });
  } else {
    await ctx.db.insert("lesson_users", {
      lesson_id: args.lessonId,
      user_id: args.userId,
      family_id: lesson.family_id,
      status: "complete",
      slide_index: 0,
      quiz_passed_at: Date.now(),
    });
  }

  const advance = await advanceLearner(ctx, {
    userId: args.userId,
    familyId: lesson.family_id,
  });
  return { activated: advance.activated };
}
