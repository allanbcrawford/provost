// Maps lesson-level signals (read scroll/completion + quiz state) into the
// per-format progress shape that <FormatProgressIcon /> consumes. Centralized
// so both the lesson preview and the family-progress views (PRO-135 / Issue
// 3.3) share one source of truth.
//
// Beta scope (per docs/plans/beta-parity-2026-04.md and beta-scope-request.md):
// Listen + Watch are deferred to V2 (NotebookLM integration); they are always
// 0 here and rendered with `disabled` at the call site.

export type LessonFormatProgress = {
  read: number;
  listen: number;
  watch: number;
  quiz: number;
};

export type QuizState = "not_started" | "in_progress" | "passed";

export type DeriveFormatProgressArgs = {
  readProgress?: number;
  quizState?: QuizState;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function deriveFormatProgress(
  args: DeriveFormatProgressArgs = {},
): LessonFormatProgress {
  const { readProgress, quizState = "not_started" } = args;

  const read = readProgress === undefined ? 0 : clamp01(readProgress);

  let quiz = 0;
  if (quizState === "in_progress") quiz = 0.5;
  else if (quizState === "passed") quiz = 1;

  return {
    read,
    listen: 0,
    watch: 0,
    quiz,
  };
}
