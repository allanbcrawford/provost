"use client";

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LessonArticle } from "@/features/lessons/lesson-article";
import { LessonSlideshow } from "@/features/lessons/lesson-slideshow";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { usePageContext } from "@/hooks/use-page-context";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

function LessonDetailPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId as Id<"lessons"> | undefined;

  // Two queries: the legacy `lessons.get` for slideshow lessons (kept for
  // backward-compat with the LessonSlideshow component), and the new
  // `lessons.getWithContext` which returns the article shape + breadcrumb +
  // recommendations. We pick which renderer to mount based on context.format.
  const context = useQuery(api.lessons.getWithContext, lessonId ? { lessonId } : "skip");
  const legacy = useQuery(api.lessons.get, lessonId ? { lessonId } : "skip");

  // Register the lesson the user is reading with the chat agent.
  usePageContext({
    selection: lessonId ? { kind: "lesson", id: lessonId } : null,
    visibleState: context
      ? {
          lessonTitle: context.lesson.title,
          format: context.lesson.format,
        }
      : undefined,
    enabled: Boolean(lessonId) && context !== null,
  });

  if (context === undefined) {
    return (
      <div className="p-8 text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</div>
    );
  }
  if (context === null) {
    return (
      <div className="p-8 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        Lesson not found.
      </div>
    );
  }

  if (context.lesson.format === "article") {
    return (
      <div className="p-4 md:p-8">
        <div className="mx-auto mb-4 flex max-w-3xl items-center gap-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
          <Link
            href="/lessons"
            className="inline-flex items-center gap-1 hover:text-provost-text-primary"
          >
            <Icon name="arrow_back" size={16} weight={400} />
            Back to lessons
          </Link>
        </div>
        <LessonArticle context={context} />
      </div>
    );
  }

  // Legacy slideshow path. `legacy` is the api.lessons.get response which
  // matches LessonSlideshow's expected shape.
  if (legacy === undefined || legacy === null) {
    return (
      <div className="p-8 text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</div>
    );
  }
  return (
    <div className="p-8">
      <div className="mx-auto mb-6 flex max-w-3xl items-center gap-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        <Link
          href="/lessons"
          className="inline-flex items-center gap-1 hover:text-provost-text-primary"
        >
          <Icon name="arrow_back" size={16} weight={400} />
          Back to lessons
        </Link>
      </div>
      <LessonSlideshow lesson={legacy} />
    </div>
  );
}

export default withRoleGuard(LessonDetailPage, APP_ROLES.LESSONS ?? []);
