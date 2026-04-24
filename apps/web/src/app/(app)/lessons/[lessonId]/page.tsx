"use client";

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LessonSlideshow } from "@/features/lessons/lesson-slideshow";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

function LessonDetailPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId as Id<"lessons"> | undefined;
  const lesson = useQuery(api.lessons.get, lessonId ? { lessonId } : "skip");

  if (lesson === undefined) {
    return (
      <div className="p-8 text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</div>
    );
  }
  if (lesson === null) {
    return (
      <div className="p-8 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        Lesson not found.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto mb-6 flex max-w-3xl items-center gap-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        <Link
          href="/lessons"
          className="inline-flex items-center gap-1 hover:text-provost-text-primary"
        >
          <Icon name="arrow_back" size={16} weight={400} />
          Back to lessons
        </Link>
      </div>
      <LessonSlideshow lesson={lesson} />
    </div>
  );
}

export default withRoleGuard(LessonDetailPage, APP_ROLES.LESSONS!);
