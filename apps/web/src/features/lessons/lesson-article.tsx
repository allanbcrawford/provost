"use client";

// Medium-style article reader. Header with breadcrumb (program → track →
// lesson), Markdown body via @provost/ui Markdown, footer with thumbs +
// bookmark + share + (if a quiz exists) "Take quiz" launcher, plus a
// "You might also enjoy" rail at the very bottom.

import { Button, Icon, Markdown } from "@provost/ui";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { LessonQuizModal } from "./lesson-quiz-modal";

type LessonContext = {
  lesson: {
    _id: Id<"lessons">;
    title: string;
    description: string;
    article_markdown: string | null;
  };
  track: { _id: Id<"tracks">; title: string } | null;
  program: { _id: Id<"programs">; title: string; stewardship_phase: string } | null;
  bookmarked: boolean;
  hasQuiz: boolean;
  recommendations: Array<{ _id: Id<"lessons">; title: string }>;
};

export function LessonArticle({ context }: { context: LessonContext }) {
  const { lesson, track, program, bookmarked, hasQuiz, recommendations } = context;
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const submitFeedback = useMutation(api.lessons.submitFeedback);
  const [thumb, setThumb] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [bookmarkedLocal, setBookmarkedLocal] = useState(bookmarked);
  const [showQuiz, setShowQuiz] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  async function handleThumbs(kind: "thumbs_up" | "thumbs_down") {
    if (thumb === kind) return;
    setThumb(kind);
    try {
      await submitFeedback({ lessonId: lesson._id, kind });
    } catch {
      setThumb(null);
    }
  }

  async function handleBookmark() {
    const next = !bookmarkedLocal;
    setBookmarkedLocal(next);
    try {
      await toggleBookmark({ lessonId: lesson._id });
    } catch {
      setBookmarkedLocal(!next); // revert
    }
  }

  function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(
      () => {
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      },
      () => {},
    );
  }

  const body = lesson.article_markdown?.trim();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-[13px] text-provost-text-secondary tracking-[-0.39px]"
      >
        <Link href="/lessons" className="hover:text-provost-text-primary">
          Lessons
        </Link>
        {program && (
          <>
            <span aria-hidden>›</span>
            <span>{program.title}</span>
          </>
        )}
        {track && (
          <>
            <span aria-hidden>›</span>
            <span>{track.title}</span>
          </>
        )}
        <span aria-hidden>›</span>
        <span className="text-provost-text-primary">{lesson.title}</span>
      </nav>

      <header>
        <h1 className="font-dm-serif font-medium text-[40px] text-provost-text-primary leading-[1.15] tracking-[-0.8px]">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-3 font-light text-[18px] text-provost-text-secondary tracking-[-0.54px]">
            {lesson.description}
          </p>
        )}
      </header>

      {body && body.length > 0 ? (
        <div className="prose prose-neutral max-w-none text-[17px] text-provost-text-primary leading-[1.7] tracking-[-0.34px]">
          <Markdown>{body}</Markdown>
        </div>
      ) : (
        <p className="rounded-md border border-provost-border-subtle border-dashed bg-provost-bg-muted/30 p-6 text-[14px] text-provost-text-secondary">
          This lesson doesn't have an article body yet. An advisor can edit it via the curation
          flow.
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-provost-border-subtle border-t pt-6">
        <Button
          variant={thumb === "thumbs_up" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleThumbs("thumbs_up")}
          aria-pressed={thumb === "thumbs_up"}
        >
          <Icon name="thumb_up" size={16} />
          <span className="ml-1">Helpful</span>
        </Button>
        <Button
          variant={thumb === "thumbs_down" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleThumbs("thumbs_down")}
          aria-pressed={thumb === "thumbs_down"}
        >
          <Icon name="thumb_down" size={16} />
          <span className="ml-1">Not for me</span>
        </Button>
        <Button
          variant={bookmarkedLocal ? "primary" : "outline"}
          size="sm"
          onClick={handleBookmark}
          aria-pressed={bookmarkedLocal}
        >
          <Icon name={bookmarkedLocal ? "bookmark" : "bookmark_border"} size={16} />
          <span className="ml-1">{bookmarkedLocal ? "Bookmarked" : "Bookmark"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Icon name="ios_share" size={16} />
          <span className="ml-1">{shareCopied ? "Link copied" : "Share"}</span>
        </Button>
        {hasQuiz && (
          <Button onClick={() => setShowQuiz(true)} className="ml-auto">
            Take quiz
          </Button>
        )}
      </footer>

      {recommendations.length > 0 && (
        <section
          aria-labelledby="rec-heading"
          className="border-provost-border-subtle border-t pt-6"
        >
          <h2
            id="rec-heading"
            className="font-medium text-[12px] text-provost-text-secondary uppercase tracking-[1px]"
          >
            You might also enjoy
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {recommendations.map((r) => (
              <li
                key={r._id}
                className="overflow-hidden rounded-[12px] border border-provost-border-subtle bg-white"
              >
                <Link href={`/lessons/${r._id}`} className="block p-4 hover:bg-provost-bg-muted/40">
                  <span className="line-clamp-2 font-medium text-[15px] text-provost-text-primary tracking-[-0.45px]">
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showQuiz && <LessonQuizModal lessonId={lesson._id} onClose={() => setShowQuiz(false)} />}
    </article>
  );
}
