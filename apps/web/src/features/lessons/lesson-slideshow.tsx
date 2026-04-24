"use client";

import { Button, Icon } from "@provost/ui";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Slide = {
  type?: string;
  title?: string;
  text?: string;
  image?: string;
};

type SlidesContent = {
  type?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  highlightColor?: string;
  introText?: string;
  slides?: Slide[];
};

export type LessonDetail = {
  _id: Id<"lessons">;
  title: string;
  description: string;
  category: string;
  content: unknown;
  assignment: {
    status: "assigned" | "in_progress" | "completed" | "overdue";
    slide_index: number;
  } | null;
};

export function LessonSlideshow({ lesson }: { lesson: LessonDetail }) {
  const content = (lesson.content ?? {}) as SlidesContent;
  const slides = useMemo<Slide[]>(() => content.slides ?? [], [content.slides]);
  const totalSlides = slides.length;
  const primaryColor = content.primaryColor ?? "#242424";
  const highlightColor = content.highlightColor ?? "#ededed";

  const initialIndex = lesson.assignment?.slide_index ?? 0;
  const [slideIndex, setSlideIndex] = useState(
    Math.min(initialIndex, Math.max(0, totalSlides - 1)),
  );
  const [isIntro, setIsIntro] = useState(
    !lesson.assignment || lesson.assignment.status === "assigned",
  );
  const [isCompleted, setIsCompleted] = useState(lesson.assignment?.status === "completed");

  const startMutation = useMutation(api.lessons.start);
  const completeMutation = useMutation(api.lessons.complete);
  const setSlideIndexMutation = useMutation(api.lessons.setSlideIndex);

  const progress = totalSlides === 0 ? 0 : Math.round(((slideIndex + 1) / totalSlides) * 100);

  const handleStart = useCallback(async () => {
    setIsIntro(false);
    await startMutation({ lessonId: lesson._id });
    if (initialIndex === 0) {
      await setSlideIndexMutation({ lessonId: lesson._id, slideIndex: 0 });
    }
  }, [startMutation, setSlideIndexMutation, lesson._id, initialIndex]);

  const goTo = useCallback(
    async (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= totalSlides) return;
      setSlideIndex(nextIndex);
      await setSlideIndexMutation({ lessonId: lesson._id, slideIndex: nextIndex });
    },
    [setSlideIndexMutation, lesson._id, totalSlides],
  );

  const handleComplete = useCallback(async () => {
    setIsCompleted(true);
    await completeMutation({ lessonId: lesson._id });
  }, [completeMutation, lesson._id]);

  useEffect(() => {
    if (totalSlides === 0) return;
    if (slideIndex > totalSlides - 1) setSlideIndex(totalSlides - 1);
  }, [slideIndex, totalSlides]);

  if (totalSlides === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        This lesson has no slides yet.
      </div>
    );
  }

  if (isIntro) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 rounded-[14px] border border-provost-border-subtle bg-white p-10">
        <div className="space-y-3">
          <p className="font-semibold text-[10.5px] uppercase tracking-wider text-provost-text-tertiary">
            {lesson.category}
          </p>
          <h2 className="font-dm-serif text-[42px] font-medium leading-[1.05] tracking-[-0.84px] text-provost-text-primary">
            {lesson.title}
          </h2>
        </div>
        {content.introText ? (
          <p className="whitespace-pre-line text-[16px] leading-relaxed text-provost-text-primary">
            {content.introText}
          </p>
        ) : (
          <p className="text-[16px] leading-relaxed text-provost-text-primary">
            {lesson.description}
          </p>
        )}
        <Button
          onClick={handleStart}
          className="h-[40px] rounded-full px-5 text-[15px] font-medium"
        >
          <Icon name="play_arrow" size={18} weight={500} />
          Start lesson
        </Button>
      </div>
    );
  }

  const slide = slides[slideIndex];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === totalSlides - 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="rounded-[14px] border border-provost-border-subtle bg-white p-10">
        {slide?.title && (
          <h2
            className="mb-5 font-dm-serif text-[32px] font-medium leading-[1.1] tracking-[-0.64px]"
            style={{ color: primaryColor }}
          >
            {slide.title}
          </h2>
        )}
        {slide?.text && (
          <div
            className="text-[16px] leading-relaxed text-provost-text-primary"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted seeded content
            dangerouslySetInnerHTML={{ __html: formatSlideText(slide.text) }}
          />
        )}
      </div>

      <div className="space-y-3">
        <div
          className="relative h-[2px] w-full rounded-full"
          style={{ backgroundColor: highlightColor }}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
            Slide {slideIndex + 1}{" "}
            <span className="text-provost-text-tertiary">of {totalSlides}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isFirst}
              onClick={() => goTo(slideIndex - 1)}
              className="h-[35px] rounded-full px-5 text-[15px] font-medium"
            >
              Back
            </Button>
            {isLast ? (
              <Button
                onClick={handleComplete}
                disabled={isCompleted}
                className="h-[35px] rounded-full px-5 text-[15px] font-medium"
              >
                {isCompleted ? "Completed" : "Complete"}
              </Button>
            ) : (
              <Button
                onClick={() => goTo(slideIndex + 1)}
                className="h-[35px] rounded-full px-5 text-[15px] font-medium"
              >
                Next
              </Button>
            )}
          </div>
        </div>
        {isCompleted && (
          <p className="text-[12px] font-medium text-emerald-700">You completed this lesson.</p>
        )}
      </div>
    </div>
  );
}

function formatSlideText(text: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = escapeHtml(text).split(/\n\n/);
  return paragraphs
    .map((p) => {
      let formatted = p
        .replace(/==([^=]+)==/g, '<mark class="bg-amber-100 px-0.5">$1</mark>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\n/g, "<br/>");
      formatted = formatted.replace(
        /(?:^|<br\/>)- (.+?)(?=(?:<br\/>-|<br\/>|$))/g,
        '<li class="ml-6 list-disc">$1</li>',
      );
      formatted = formatted.replace(/(<li[^>]*>.*?<\/li>)+/g, '<ul class="my-3 space-y-1">$&</ul>');
      return `<p class="mt-4 first:mt-0">${formatted}</p>`;
    })
    .join("");
}
