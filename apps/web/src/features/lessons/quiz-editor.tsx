"use client";

// Controlled quiz editor for the in-browser curation flow. Parent owns the
// quiz draft state (so it can mirror it into usePageContext) — this
// component just renders inputs and bubbles changes up.
//
// A quiz question always has exactly 4 choices in the family-facing reader.
// The editor enforces that invariant via fixed-width choice arrays.

import { Button, Icon, Input, Label } from "@provost/ui";

export type DraftQuestion = {
  prompt: string;
  choices: string[]; // length 4
  correct_choice_index: number;
  explanation: string; // optional in storage; "" means "no explanation"
};

export type QuizDraft = {
  pass_score: number;
  questions: DraftQuestion[];
};

export const CHOICE_COUNT = 4;

export function emptyQuestion(): DraftQuestion {
  return {
    prompt: "",
    choices: Array.from({ length: CHOICE_COUNT }, () => ""),
    correct_choice_index: 0,
    explanation: "",
  };
}

export function QuizEditor({
  draft,
  onChange,
}: {
  draft: QuizDraft;
  onChange: (next: QuizDraft) => void;
}) {
  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    const questions = draft.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange({ ...draft, questions });
  };

  const moveQuestion = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= draft.questions.length) return;
    const questions = [...draft.questions];
    const [moved] = questions.splice(idx, 1);
    if (!moved) return;
    questions.splice(target, 0, moved);
    onChange({ ...draft, questions });
  };

  const removeQuestion = (idx: number) => {
    const questions = draft.questions.filter((_, i) => i !== idx);
    onChange({ ...draft, questions });
  };

  const addQuestion = () => {
    onChange({ ...draft, questions: [...draft.questions, emptyQuestion()] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="quiz-pass-score">Pass score (0 – 1)</Label>
          <Input
            id="quiz-pass-score"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={draft.pass_score}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              onChange({
                ...draft,
                pass_score: Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0,
              });
            }}
            className="w-32"
          />
        </div>
        <p className="pb-2 text-[12px] text-provost-text-secondary">
          Learner must answer at least {Math.ceil(draft.pass_score * draft.questions.length)} of{" "}
          {draft.questions.length} correctly to pass.
        </p>
      </div>

      <ol className="space-y-6">
        {draft.questions.map((q, idx) => (
          <li key={idx} className="rounded-lg border border-provost-border-default bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-[13px] text-provost-text-primary">
                Question {idx + 1}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveQuestion(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move question up"
                >
                  <Icon name="arrow_upward" size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveQuestion(idx, 1)}
                  disabled={idx === draft.questions.length - 1}
                  aria-label="Move question down"
                >
                  <Icon name="arrow_downward" size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(idx)}
                  aria-label="Remove question"
                >
                  <Icon name="delete" size={16} />
                </Button>
              </div>
            </div>

            <div className="mb-3">
              <Label htmlFor={`q-${idx}-prompt`}>Prompt</Label>
              <textarea
                id={`q-${idx}-prompt`}
                value={q.prompt}
                onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-provost-border-default bg-white p-2 text-[13px] text-provost-text-primary outline-none focus:border-provost-text-primary focus:ring-1 focus:ring-provost-text-primary"
              />
            </div>

            <fieldset className="mb-3">
              <legend className="mb-1.5 font-semibold text-[11px] text-provost-text-secondary uppercase tracking-[0.5px]">
                Choices (select correct answer)
              </legend>
              <div className="space-y-2">
                {q.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${idx}-correct`}
                      checked={q.correct_choice_index === ci}
                      onChange={() => updateQuestion(idx, { correct_choice_index: ci })}
                      className="h-4 w-4 accent-provost-text-primary"
                      aria-label={`Mark choice ${ci + 1} correct`}
                    />
                    <Input
                      value={choice}
                      onChange={(e) => {
                        const choices = [...q.choices];
                        choices[ci] = e.target.value;
                        updateQuestion(idx, { choices });
                      }}
                      placeholder={`Choice ${ci + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor={`q-${idx}-explanation`}>
                Explanation <span className="text-provost-text-secondary">(optional)</span>
              </Label>
              <textarea
                id={`q-${idx}-explanation`}
                value={q.explanation}
                onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-provost-border-default bg-white p-2 text-[13px] text-provost-text-primary outline-none focus:border-provost-text-primary focus:ring-1 focus:ring-provost-text-primary"
              />
            </div>
          </li>
        ))}
      </ol>

      <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
        <Icon name="add" size={16} />
        Add question
      </Button>
    </div>
  );
}
