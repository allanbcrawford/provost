"use client";

// Site-admin in-browser lesson editor. The (admin) layout already wraps
// every route with `withSiteAdminGuard`, so non-site-admins are bounced
// before this page ever mounts. Convex mutations re-check site-admin
// server-side as defense in depth.
//
// Three sections, all controlled forms whose draft state is mirrored into
// usePageContext so the chat agent can answer "tighten this paragraph"
// without the curator re-pasting the body.

import { Button, Icon, Input, Label } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "@/features/lessons/markdown-editor";
import {
  CHOICE_COUNT,
  emptyQuestion,
  type QuizDraft,
  QuizEditor,
} from "@/features/lessons/quiz-editor";
import { usePageContext } from "@/hooks/use-page-context";
import { api } from "../../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../../convex/_generated/dataModel";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function StatusPill({ status, error }: { status: SaveStatus; error?: string | null }) {
  if (status === "idle") return null;
  const tone =
    status === "saved"
      ? "bg-green-50 text-green-700"
      : status === "error"
        ? "bg-red-50 text-red-700"
        : "bg-provost-bg-secondary text-provost-text-secondary";
  const label =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : (error ?? "Save failed");
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium text-[11px] ${tone}`}>{label}</span>
  );
}

export default function AdminLessonEditPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId: rawLessonId } = use(params);
  const lessonId = rawLessonId as Id<"lessons">;

  const data = useQuery(api.lessons.getForAdminEdit, { lessonId });
  const adminQuiz = useQuery(api.quizzes.getForLessonAsAdmin, { lessonId });

  const updateMetadata = useMutation(api.lessons.updateMetadata);
  const updateArticle = useMutation(api.lessons.updateArticle);
  const upsertQuiz = useMutation(api.quizzes.upsertForLesson);
  const regenerate = useMutation(api.learningBackfill.regenerateArticleForLesson);

  // -- Metadata draft -------------------------------------------------------
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFormat, setDraftFormat] = useState<"article" | "slides">("article");
  const [metadataStatus, setMetadataStatus] = useState<SaveStatus>("idle");
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // -- Article body draft ---------------------------------------------------
  const [draftBody, setDraftBody] = useState("");
  const [bodyStatus, setBodyStatus] = useState<SaveStatus>("idle");
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // -- Quiz draft -----------------------------------------------------------
  const [draftQuiz, setDraftQuiz] = useState<QuizDraft>({
    pass_score: 0.7,
    questions: [],
  });
  const [quizStatus, setQuizStatus] = useState<SaveStatus>("idle");
  const [quizError, setQuizError] = useState<string | null>(null);

  // Hydrate drafts when the server payload arrives. We only seed once per
  // lesson load — the curator owns the draft after that.
  useEffect(() => {
    if (!data) return;
    setDraftTitle(data.lesson.title);
    setDraftDescription(data.lesson.description);
    setDraftFormat(data.lesson.format);
    setDraftBody(data.lesson.article_markdown ?? "");
  }, [data]);

  useEffect(() => {
    if (adminQuiz === undefined) return;
    if (adminQuiz === null) {
      setDraftQuiz({ pass_score: 0.7, questions: [emptyQuestion()] });
      return;
    }
    setDraftQuiz({
      pass_score: adminQuiz.pass_score,
      questions: adminQuiz.questions.map((q) => ({
        prompt: q.prompt,
        choices: padChoices(q.choices),
        correct_choice_index: q.correct_choice_index,
        explanation: q.explanation ?? "",
      })),
    });
  }, [adminQuiz]);

  // Mirror draft state into usePageContext so the chat agent gets the
  // current in-progress edits, not just the persisted lesson.
  const visibleState = useMemo(
    () => ({
      draftTitle,
      draftBody,
      draftQuiz,
    }),
    [draftTitle, draftBody, draftQuiz],
  );
  usePageContext({
    selection: { kind: "lesson", id: lessonId },
    visibleState,
    enabled: data !== undefined && data !== null,
  });

  if (data === undefined || adminQuiz === undefined) {
    return <div className="p-8 text-[14px] text-provost-text-secondary">Loading…</div>;
  }
  if (data === null) {
    return (
      <div className="p-8 text-[14px] text-provost-text-secondary">
        Lesson not found.{" "}
        <Link href="/library" className="underline">
          Back to library
        </Link>
      </div>
    );
  }

  const onSaveMetadata = async () => {
    setMetadataStatus("saving");
    setMetadataError(null);
    try {
      await updateMetadata({
        lessonId,
        title: draftTitle,
        description: draftDescription,
        format: draftFormat,
      });
      setMetadataStatus("saved");
    } catch (err) {
      setMetadataStatus("error");
      setMetadataError(messageFromError(err));
    }
  };

  const onSaveBody = async () => {
    setBodyStatus("saving");
    setBodyError(null);
    try {
      await updateArticle({ lessonId, articleMarkdown: draftBody });
      setBodyStatus("saved");
    } catch (err) {
      setBodyStatus("error");
      setBodyError(messageFromError(err));
    }
  };

  const onRegenerate = async () => {
    if (
      !confirm(
        "Regenerate Markdown from the lesson's slide content? This overwrites the current draft body.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setBodyError(null);
    try {
      const { articleMarkdown } = await regenerate({ lessonId });
      setDraftBody(articleMarkdown);
      setBodyStatus("saved");
    } catch (err) {
      setBodyStatus("error");
      setBodyError(messageFromError(err));
    } finally {
      setRegenerating(false);
    }
  };

  const onSaveQuiz = async () => {
    setQuizStatus("saving");
    setQuizError(null);
    // Validate before sending — the server will also re-check.
    for (const [i, q] of draftQuiz.questions.entries()) {
      if (q.prompt.trim().length === 0) {
        setQuizStatus("error");
        setQuizError(`Question ${i + 1} prompt is empty`);
        return;
      }
      if (q.choices.some((c) => c.trim().length === 0)) {
        setQuizStatus("error");
        setQuizError(`Question ${i + 1} has an empty choice`);
        return;
      }
      if (q.correct_choice_index < 0 || q.correct_choice_index >= q.choices.length) {
        setQuizStatus("error");
        setQuizError(`Question ${i + 1} has no correct answer selected`);
        return;
      }
    }
    try {
      await upsertQuiz({
        lessonId,
        passScore: draftQuiz.pass_score,
        questions: draftQuiz.questions.map((q) => ({
          prompt: q.prompt.trim(),
          choices: q.choices.map((c) => c.trim()),
          correct_choice_index: q.correct_choice_index,
          explanation: q.explanation.trim().length > 0 ? q.explanation.trim() : undefined,
        })),
      });
      setQuizStatus("saved");
    } catch (err) {
      setQuizStatus("error");
      setQuizError(messageFromError(err));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2 text-[14px] text-provost-text-secondary">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 hover:text-provost-text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Back to library
        </Link>
      </div>

      <h1 className="mb-1 font-semibold text-[24px] text-provost-text-primary tracking-[-0.72px]">
        Edit lesson
      </h1>
      <p className="mb-8 text-[13px] text-provost-text-secondary">
        {data.program?.title ?? "—"}
        {data.track ? ` · ${data.track.title}` : ""}
      </p>

      {/* METADATA */}
      <section className="mb-10 rounded-lg border border-provost-border-default bg-white p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[16px] text-provost-text-primary">Metadata</h2>
          <StatusPill status={metadataStatus} error={metadataError} />
        </header>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-[11px]">Program</Label>
            <p className="mt-1 text-[13px] text-provost-text-primary">
              {data.program?.title ?? "Unassigned"}
            </p>
          </div>
          <div>
            <Label className="text-[11px]">Track</Label>
            <p className="mt-1 text-[13px] text-provost-text-primary">
              {data.track?.title ?? "Unassigned"}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="lesson-title">Title</Label>
          <Input
            id="lesson-title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="lesson-description">Description</Label>
          <textarea
            id="lesson-description"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-provost-border-default bg-white p-2 text-[13px] text-provost-text-primary outline-none focus:border-provost-text-primary focus:ring-1 focus:ring-provost-text-primary"
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="lesson-format">Format</Label>
          <select
            id="lesson-format"
            value={draftFormat}
            onChange={(e) => setDraftFormat(e.target.value as "article" | "slides")}
            className="block h-9 w-48 rounded-md border border-provost-border-default bg-white px-2 text-[13px] text-provost-text-primary"
          >
            <option value="article">Article (Markdown)</option>
            <option value="slides">Slides (legacy)</option>
          </select>
        </div>

        <Button onClick={onSaveMetadata} disabled={metadataStatus === "saving"}>
          Save metadata
        </Button>
      </section>

      {/* ARTICLE BODY */}
      <section className="mb-10 rounded-lg border border-provost-border-default bg-white p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[16px] text-provost-text-primary">Article body</h2>
          <StatusPill status={bodyStatus} error={bodyError} />
        </header>

        <MarkdownEditor value={draftBody} onChange={setDraftBody} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onSaveBody} disabled={bodyStatus === "saving"}>
            Save body
          </Button>
          <Button
            variant="secondary"
            onClick={onRegenerate}
            disabled={regenerating}
            title="Regenerate Markdown from the lesson's slide content"
          >
            <Icon name="refresh" size={16} />
            {regenerating ? "Regenerating…" : "Regenerate from slides"}
          </Button>
        </div>
      </section>

      {/* QUIZ */}
      <section className="mb-10 rounded-lg border border-provost-border-default bg-white p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[16px] text-provost-text-primary">Quiz</h2>
          <StatusPill status={quizStatus} error={quizError} />
        </header>

        <QuizEditor draft={draftQuiz} onChange={setDraftQuiz} />

        <div className="mt-6">
          <Button onClick={onSaveQuiz} disabled={quizStatus === "saving"}>
            Save quiz
          </Button>
        </div>
      </section>
    </div>
  );
}

function padChoices(choices: string[]): string[] {
  if (choices.length === CHOICE_COUNT) return choices;
  if (choices.length < CHOICE_COUNT) {
    return [...choices, ...Array.from({ length: CHOICE_COUNT - choices.length }, () => "")];
  }
  return choices.slice(0, CHOICE_COUNT);
}

function messageFromError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
