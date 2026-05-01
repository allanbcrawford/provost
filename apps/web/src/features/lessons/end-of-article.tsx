"use client";

// PRD §16.6 end-of-article footer. Renders below the article body and
// surfaces:
//   • Thumbs-up / thumbs-down ("Did you enjoy this lesson?") with optimistic
//     toggle. Backed by `lessons.submitFeedback` (kind: thumbs_up/down).
//   • Feedback button — opens the chat rail with a primed seed prompt so the
//     user can write open-ended feedback. The chat thread captures it; a
//     follow-up `submit_lesson_feedback` agent tool would close the loop and
//     write a `comment` row to `lesson_feedback` (TODO — out of scope for
//     issue 3.2).
//   • Share button — copies a link to the lesson to the clipboard. The page
//     itself is auth-protected, so logged-out clicks hit the sign-in flow.
//   • "You might also enjoy" rail — 2–3 related lessons from the same track
//     (then the next track in the same program), excluding completed ones.

import { Button, Icon } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type ThumbState = "thumbs_up" | "thumbs_down" | null;

type Props = {
  lessonId: Id<"lessons">;
  lessonTitle: string;
  initialThumb?: ThumbState;
};

const FEEDBACK_SEED_PREFIX = "I'd like to share feedback on the lesson";

export function LessonEndOfArticle({ lessonId, lessonTitle, initialThumb = null }: Props) {
  const submitFeedback = useMutation(api.lessons.submitFeedback);
  const { requestSeedPrompt } = useChatPanel();
  const [thumb, setThumb] = useState<ThumbState>(initialThumb);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");

  const recommendations = useQuery(api.lessons.relatedLessons, { lessonId, limit: 3 });

  async function handleThumb(kind: "thumbs_up" | "thumbs_down") {
    // Optimistic toggle: clicking the active thumb leaves it set (the upsert
    // is idempotent — touching the row's created_at is harmless).
    const prev = thumb;
    setThumb(kind);
    try {
      await submitFeedback({ lessonId, kind });
    } catch {
      setThumb(prev);
    }
  }

  function handleFeedback() {
    requestSeedPrompt(`${FEEDBACK_SEED_PREFIX} "${lessonTitle}": `);
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/lessons/${lessonId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
    window.setTimeout(() => setShareStatus("idle"), 2000);
  }

  return (
    <section
      aria-label="Lesson feedback and recommendations"
      className="flex flex-col gap-8 border-provost-border-subtle border-t pt-8"
    >
      <div className="flex flex-col gap-4">
        <p className="font-medium text-[15px] text-provost-text-primary tracking-[-0.45px]">
          Did you enjoy this lesson?
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant={thumb === "thumbs_up" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleThumb("thumbs_up")}
            aria-pressed={thumb === "thumbs_up"}
            aria-label="Thumbs up"
          >
            <Icon name="thumb_up" size={16} />
            <span className="ml-1">Yes</span>
          </Button>
          <Button
            variant={thumb === "thumbs_down" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleThumb("thumbs_down")}
            aria-pressed={thumb === "thumbs_down"}
            aria-label="Thumbs down"
          >
            <Icon name="thumb_down" size={16} />
            <span className="ml-1">No</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleFeedback}>
          <Icon name="rate_review" size={16} />
          <span className="ml-1">Feedback</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Icon name="ios_share" size={16} />
          <span className="ml-1">
            {shareStatus === "copied"
              ? "Link copied"
              : shareStatus === "failed"
                ? "Copy failed"
                : "Share"}
          </span>
        </Button>
        {/* aria-live region announces the share result to screen readers. */}
        <span className="sr-only" aria-live="polite">
          {shareStatus === "copied"
            ? "Link copied to clipboard"
            : shareStatus === "failed"
              ? "Could not copy link"
              : ""}
        </span>
      </div>

      <RelatedLessons recommendations={recommendations} />
    </section>
  );
}

type Recommendation = {
  id: Id<"lessons">;
  title: string;
  trackTitle: string | null;
  programTitle: string | null;
  lessonType: "article" | "slides";
  summary: string;
};

function RelatedLessons({ recommendations }: { recommendations: Recommendation[] | undefined }) {
  if (recommendations === undefined) {
    return (
      <div className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
        Loading recommendations…
      </div>
    );
  }
  if (recommendations.length === 0) return null;
  return (
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
      {/* Horizontal scroll on mobile; grid on md+. */}
      <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
        {recommendations.map((r) => (
          <li
            key={r.id}
            className="min-w-[260px] shrink-0 snap-start overflow-hidden rounded-[12px] border border-provost-border-subtle bg-white md:min-w-0"
          >
            <Link
              href={`/lessons/${r.id}`}
              className="flex h-full flex-col gap-2 p-4 hover:bg-provost-bg-muted/40"
            >
              <div className="flex items-center gap-2 text-[12px] text-provost-text-secondary uppercase tracking-[1px]">
                {/* TODO: swap for shared format icon once Issue 3.1 lands. */}
                <Icon
                  name={r.lessonType === "article" ? "article" : "slideshow"}
                  size={14}
                />
                <span className="truncate">
                  {[r.programTitle, r.trackTitle].filter(Boolean).join(" · ") || "Lesson"}
                </span>
              </div>
              <span className="line-clamp-2 font-medium text-[15px] text-provost-text-primary tracking-[-0.45px]">
                {r.title}
              </span>
              {r.summary && (
                <span className="line-clamp-2 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                  {r.summary}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
