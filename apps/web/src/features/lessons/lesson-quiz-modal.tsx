"use client";

// Quiz launcher modal. Triggered from the article footer; submits via
// quizzes.submitAttempt and surfaces pass/fail. On pass the backend
// triggers completeLessonAndAdvance, which unlocks the next lesson — we
// just show the result and let the user navigate.

import { Button } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type QuizPayload = {
  _id: Id<"quizzes">;
  lesson_id: Id<"lessons">;
  pass_score: number;
  questions: Array<{
    prompt: string;
    choices: string[];
    explanation: string | null;
  }>;
};

type SubmitResult = {
  attemptId: Id<"quiz_attempts">;
  score: number;
  passed: boolean;
  activatedLessonIds: Id<"lessons">[];
};

export function LessonQuizModal({
  lessonId,
  onClose,
}: {
  lessonId: Id<"lessons">;
  onClose: () => void;
}) {
  const quiz = useQuery(api.quizzes.getForLesson, { lessonId }) as QuizPayload | null | undefined;
  const submit = useMutation(api.quizzes.submitAttempt);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  if (quiz === undefined) {
    return (
      <Backdrop onClose={onClose}>
        <p className="p-8 text-[14px] text-provost-text-secondary">Loading quiz…</p>
      </Backdrop>
    );
  }
  if (quiz === null) {
    return (
      <Backdrop onClose={onClose}>
        <div className="p-8 text-[14px] text-provost-text-secondary">
          No quiz attached to this lesson yet.
        </div>
      </Backdrop>
    );
  }

  async function handleSubmit() {
    if (!quiz) return;
    if (Object.keys(answers).length !== quiz.questions.length) return;
    setSubmitting(true);
    try {
      const arr = quiz.questions.map((_, i) => answers[i] ?? -1);
      const r = (await submit({ quizId: quiz._id, answers: arr })) as SubmitResult;
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Backdrop onClose={onClose}>
        <div className="flex flex-col gap-4 p-8">
          <h2 className="font-dm-serif font-medium text-[28px] text-provost-text-primary tracking-[-0.56px]">
            {result.passed ? "Lesson complete" : "Not quite"}
          </h2>
          <p className="text-[15px] text-provost-text-secondary tracking-[-0.45px]">
            You scored {Math.round(result.score * 100)}% — pass threshold is{" "}
            {Math.round(quiz.pass_score * 100)}%.
            {result.passed
              ? result.activatedLessonIds.length > 0
                ? " Next lesson unlocked."
                : ""
              : " Take the lesson again and try once more."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Backdrop>
    );
  }

  const allAnswered = Object.keys(answers).length === quiz.questions.length;

  return (
    <Backdrop onClose={onClose}>
      <div className="flex max-h-[80vh] flex-col">
        <div className="border-provost-border-subtle border-b px-6 py-4">
          <h2 className="font-dm-serif font-medium text-[24px] text-provost-text-primary tracking-[-0.48px]">
            Quiz
          </h2>
          <p className="mt-1 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
            {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} · pass at{" "}
            {Math.round(quiz.pass_score * 100)}%
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ol className="flex flex-col gap-6">
            {quiz.questions.map((q, qi) => (
              <li key={`q-${qi}`}>
                <p className="font-medium text-[15px] text-provost-text-primary tracking-[-0.45px]">
                  {qi + 1}. {q.prompt}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {q.choices.map((choice, ci) => {
                    const selected = answers[qi] === ci;
                    return (
                      <label
                        key={`q-${qi}-c-${ci}`}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[14px] tracking-[-0.42px] transition-colors ${
                          selected
                            ? "border-provost-text-primary bg-provost-bg-secondary"
                            : "border-provost-border-subtle bg-white hover:bg-provost-bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          value={ci}
                          checked={selected}
                          onChange={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                          className="cursor-pointer"
                        />
                        <span className="text-provost-text-primary">{choice}</span>
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-center justify-between border-provost-border-subtle border-t px-6 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Escape-to-close + click-outside-to-close. The backdrop is rendered as a
  // button (visually transparent) so click + keyboard activation are both
  // exposed without a noStaticElementInteractions violation.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
