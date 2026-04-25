// One-shot migration: introduces Programs/Tracks above existing lessons and
// converts lesson_users.status to the new vocabulary. Idempotent — safe to
// re-run. Invoke per family:
//
//   npx convex run learningBackfill:migrate
//
// Strategy:
//   1. For each family that has lessons but no programs, create a default
//      Program per stewardship phase ("Emerging" / "Developing" / "Operating"
//      / "Enduring") and a single "Foundations" Track per program.
//   2. Group existing lessons under the family's Operating program (the most
//      common starting point); admins can re-assign tracks later via the UI.
//   3. Backfill lesson.track_id + sort_order in insertion order.
//   4. Convert lesson_users.status:
//        assigned     → active
//        in_progress  → active
//        completed    → complete
//        overdue      → active
//      And populate lesson_users.family_id from the lesson's family.
//   5. Drop lesson_users.due_date by patching it to undefined (Convex permits
//      removing optional fields via patch with `undefined`).

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

const PHASES = ["emerging", "developing", "operating", "enduring"] as const;
type Phase = (typeof PHASES)[number];

function titleForPhase(phase: Phase): string {
  switch (phase) {
    case "emerging":
      return "Emerging Stewards";
    case "developing":
      return "Developing Stewards";
    case "operating":
      return "Operating Stewards";
    case "enduring":
      return "Enduring Stewards";
  }
}

async function ensureProgramsForFamily(
  ctx: { db: typeof globalThis extends never ? never : any },
  familyId: Id<"families">,
): Promise<Map<Phase, Id<"programs">>> {
  // We index PROGRAMS by (family_id, stewardship_phase) — fetch all family
  // programs and bucket. Idempotent: only inserts when the bucket is empty.
  const dbCtx = ctx as { db: { query: (t: string) => any; insert: any } };
  const existing: Doc<"programs">[] = await dbCtx.db
    .query("programs")
    .withIndex("by_family", (q: any) => q.eq("family_id", familyId))
    .collect();
  const live = existing.filter((p) => !p.deleted_at);
  const map = new Map<Phase, Id<"programs">>();
  for (const p of live) {
    map.set(p.stewardship_phase as Phase, p._id);
  }
  let order = 0;
  for (const phase of PHASES) {
    if (map.has(phase)) {
      order++;
      continue;
    }
    const id: Id<"programs"> = await dbCtx.db.insert("programs", {
      family_id: familyId,
      title: titleForPhase(phase),
      stewardship_phase: phase,
      sort_order: order++,
    });
    map.set(phase, id);
  }
  return map;
}

async function ensureFoundationsTrack(
  ctx: { db: any },
  programId: Id<"programs">,
  familyId: Id<"families">,
): Promise<Id<"tracks">> {
  const tracks: Doc<"tracks">[] = await ctx.db
    .query("tracks")
    .withIndex("by_program", (q: any) => q.eq("program_id", programId))
    .collect();
  const existing = tracks.find((t) => !t.deleted_at && t.title === "Foundations");
  if (existing) return existing._id;
  return await ctx.db.insert("tracks", {
    program_id: programId,
    family_id: familyId,
    title: "Foundations",
    description: "Default track populated by the P0b migration.",
    sort_order: 0,
  });
}

export const migrate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allLessons = await ctx.db.query("lessons").collect();
    const lessonsByFamily = new Map<Id<"families">, Doc<"lessons">[]>();
    for (const l of allLessons) {
      if (l.deleted_at) continue;
      const list = lessonsByFamily.get(l.family_id) ?? [];
      list.push(l);
      lessonsByFamily.set(l.family_id, list);
    }

    let lessonsRebucketed = 0;
    let lessonsAlreadyTracked = 0;

    for (const [familyId, lessons] of lessonsByFamily) {
      const programByPhase = await ensureProgramsForFamily(ctx, familyId);
      const operatingProgram = programByPhase.get("operating");
      if (!operatingProgram) continue;
      const trackId = await ensureFoundationsTrack(ctx, operatingProgram, familyId);

      lessons.sort((a, b) => a._creationTime - b._creationTime);
      let order = 0;
      for (const l of lessons) {
        if (l.track_id) {
          lessonsAlreadyTracked++;
          continue;
        }
        await ctx.db.patch(l._id, {
          track_id: trackId,
          sort_order: order++,
        });
        lessonsRebucketed++;
      }
    }

    // Convert lesson_users statuses + populate family_id + drop due_date.
    const allRows = await ctx.db.query("lesson_users").collect();
    let rowsRewritten = 0;
    for (const r of allRows) {
      const lesson = await ctx.db.get(r.lesson_id);
      if (!lesson) continue;
      const newStatus =
        r.status === "assigned"
          ? "active"
          : r.status === "in_progress"
            ? "active"
            : r.status === "completed"
              ? "complete"
              : r.status === "overdue"
                ? "active"
                : null;
      const needsRewrite =
        newStatus !== null ||
        r.family_id === undefined ||
        r.family_id !== lesson.family_id ||
        r.due_date !== undefined;
      if (!needsRewrite) continue;
      const patch: Partial<Doc<"lesson_users">> & { due_date?: undefined } = {};
      if (newStatus) patch.status = newStatus as Doc<"lesson_users">["status"];
      if (r.family_id !== lesson.family_id) patch.family_id = lesson.family_id;
      if (r.due_date !== undefined) patch.due_date = undefined;
      await ctx.db.patch(r._id, patch);
      rowsRewritten++;
    }

    return {
      familiesProcessed: lessonsByFamily.size,
      lessonsRebucketed,
      lessonsAlreadyTracked,
      assignmentsRewritten: rowsRewritten,
    };
  },
});

// Demo seeder: assigns stewardship_phase to every family member (deriving from
// the legacy `learning_path` string set during seed if present, otherwise by
// generation), generates a 3-question stub quiz for every lesson that doesn't
// already have one, and calls advanceLearner for every member so their first
// 2 active lessons unlock. Idempotent. Run after `learningBackfill:migrate`:
//
//   npx convex run learningBackfill:seedDemoPhasesAndQuizzes
//
// In production, do NOT run this — phases are set by advisor at onboarding,
// quizzes are authored by advisors via the curriculum tools.
import { advanceLearner } from "./lessonDelivery";

function phaseFromLearningPath(
  learningPath: string | undefined,
  generation: number,
): "emerging" | "developing" | "operating" | "enduring" {
  if (learningPath) {
    const lower = learningPath.toLowerCase();
    if (lower.includes("enduring")) return "enduring";
    if (lower.includes("operating")) return "operating";
    if (lower.includes("developing")) return "developing";
    if (lower.includes("emerging")) return "emerging";
  }
  // Fallback by generation: gen 1 = enduring, gen 2 = operating, gen 3 = developing,
  // gen 4+ = emerging. Matches typical multi-generational family office cohorts.
  if (generation <= 1) return "enduring";
  if (generation === 2) return "operating";
  if (generation === 3) return "developing";
  return "emerging";
}

function stubQuestionsForLesson(title: string): Array<{
  prompt: string;
  choices: string[];
  correct_choice_index: number;
  explanation?: string;
}> {
  // 3 generic comprehension questions. Real quizzes are authored per-lesson.
  return [
    {
      prompt: `Who is the primary intended audience for "${title}"?`,
      choices: [
        "Family members reading to understand stewardship",
        "Tax authorities",
        "External vendors",
        "Marketing teams",
      ],
      correct_choice_index: 0,
      explanation: "Provost lessons are written for the family stewardship audience.",
    },
    {
      prompt: "Which best describes the goal of a stewardship lesson?",
      choices: [
        "Sell a product",
        "Build understanding of a wealth-planning concept",
        "Audit existing documents",
        "Replace professional advice",
      ],
      correct_choice_index: 1,
      explanation: "Lessons are educational. They complement, not replace, professional advice.",
    },
    {
      prompt: "After finishing a lesson, what does Provost typically do next for the learner?",
      choices: [
        "Send a final exam",
        "Recommend a related lesson and unlock the next one in the track",
        "Disable chat",
        "Bill the family",
      ],
      correct_choice_index: 1,
      explanation:
        "Completing a lesson advances the 2-active queue and may surface a related recommendation.",
    },
  ];
}

export const seedDemoPhasesAndQuizzes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    let phasesAssigned = 0;
    let quizzesCreated = 0;
    let advanceCalls = 0;

    for (const family of families) {
      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", family._id))
        .collect();

      // Step 1 — assign stewardship_phase to each member that doesn't have one.
      for (const m of memberships) {
        const u = await ctx.db.get(m.user_id);
        if (!u) continue;
        if (u.stewardship_phase) continue;
        const phase = phaseFromLearningPath(u.learning_path, u.generation);
        await ctx.db.patch(u._id, { stewardship_phase: phase });
        phasesAssigned++;
      }

      // Step 2 — generate a stub quiz per lesson without one.
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_family", (q) => q.eq("family_id", family._id))
        .collect();
      for (const l of lessons) {
        if (l.deleted_at) continue;
        const existing = await ctx.db
          .query("quizzes")
          .withIndex("by_lesson", (q) => q.eq("lesson_id", l._id))
          .unique();
        if (existing) continue;
        await ctx.db.insert("quizzes", {
          lesson_id: l._id,
          family_id: family._id,
          pass_score: 0.7,
          questions: stubQuestionsForLesson(l.title),
        });
        quizzesCreated++;
      }

      // Step 3 — advance every member so their initial 2 active lessons unlock.
      for (const m of memberships) {
        await advanceLearner(ctx, { userId: m.user_id, familyId: family._id });
        advanceCalls++;
      }
    }

    return { phasesAssigned, quizzesCreated, advanceCalls };
  },
});

// Diagnostic: per-member rollup of phase + active/complete counts. Useful
// after seeding to confirm advanceLearner produced the expected 2 active.
export const memberRollup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    const out = [];
    for (const f of families) {
      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      for (const m of memberships) {
        const u = await ctx.db.get(m.user_id);
        if (!u) continue;
        const rows = await ctx.db
          .query("lesson_users")
          .withIndex("by_user", (q) => q.eq("user_id", u._id))
          .collect();
        const familyRows = rows.filter((r) => r.family_id === f._id);
        out.push({
          family: f.name,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
          role: m.role,
          phase: u.stewardship_phase ?? null,
          active: familyRows.filter((r) => r.status === "active").length,
          complete: familyRows.filter((r) => r.status === "complete").length,
          locked: familyRows.filter((r) => r.status === "locked").length,
        });
      }
    }
    return out;
  },
});

// Diagnostic: counts of the new-shape data per family.
export const inspect = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    const out = [];
    for (const f of families) {
      const programs = await ctx.db
        .query("programs")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const tracks = await ctx.db
        .query("tracks")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const lessonsTracked = lessons.filter((l) => !l.deleted_at && l.track_id);
      out.push({
        family: f.name,
        programs: programs.filter((p) => !p.deleted_at).length,
        tracks: tracks.filter((t) => !t.deleted_at).length,
        lessons: lessons.filter((l) => !l.deleted_at).length,
        lessonsTracked: lessonsTracked.length,
      });
    }
    return out;
  },
});

// One-shot migration that converts every slides-format lesson into a
// Markdown article. Lossy by design — interactive prompts and follow-up
// question suggestions inside slides are dropped; only slide titles and
// body text survive. Idempotent: skips lessons that already have a
// non-empty article_markdown.
//
//   npx convex run learningBackfill:migrateArticles
//
// After this runs, the reader switches to the Markdown article view; the
// legacy slideshow renderer remains available as a fallback for lessons
// that didn't migrate.
export const migrateArticles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lessons = await ctx.db.query("lessons").collect();
    let converted = 0;
    let skipped = 0;
    for (const l of lessons) {
      if (l.deleted_at) continue;
      if (l.article_markdown && l.article_markdown.trim().length > 0) {
        skipped++;
        continue;
      }
      const md = slidesToMarkdown(l.title, l.description, l.content);
      await ctx.db.patch(l._id, {
        article_markdown: md,
        format: "article",
      });
      converted++;
    }
    return { converted, skipped, total: lessons.length };
  },
});

// Render a slides-shaped lesson body to Markdown. Walks the same shape the
// legacy LessonSlideshow component reads. Drops interactive content (quiz
// prompts, multi-select questions, follow_up_questions) — those don't have a
// clean article equivalent and the new reader has its own quiz launcher.
function slidesToMarkdown(
  title: string,
  description: string | undefined,
  content: unknown,
): string {
  const sections: string[] = [];
  const intro =
    typeof (content as { introText?: unknown })?.introText === "string"
      ? (content as { introText: string }).introText.trim()
      : (description?.trim() ?? "");
  sections.push(`# ${title}`);
  if (intro.length > 0) {
    sections.push(intro);
  }

  const slides = (content as { slides?: Array<unknown> })?.slides;
  if (Array.isArray(slides)) {
    for (const raw of slides) {
      if (!raw || typeof raw !== "object") continue;
      const slide = raw as { title?: unknown; text?: unknown; type?: unknown };
      // Skip slides that aren't text-shaped (e.g. interactive question types).
      if (slide.type && slide.type !== "text") continue;
      const slideTitle = typeof slide.title === "string" ? slide.title.trim() : "";
      const slideText = typeof slide.text === "string" ? slide.text.trim() : "";
      if (!slideTitle && !slideText) continue;
      if (slideTitle) sections.push(`## ${slideTitle}`);
      if (slideText) sections.push(slideText);
    }
  }

  // Many seed lessons are fully interactive (the "Finding a College" type)
  // and have no text slides. Surface a placeholder so the reader doesn't
  // render an empty article — admins can replace via lessons.updateArticle.
  if (sections.length <= 2) {
    sections.push(
      "> _This lesson is interactive in its original form. A Markdown version" +
        " has not been authored yet — an advisor can edit this lesson via the" +
        " curation flow to add the article body._",
    );
  }

  return sections.join("\n\n");
}
