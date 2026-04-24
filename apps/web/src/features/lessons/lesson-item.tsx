"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type LessonListItem = {
  _id: Id<"lessons">;
  title: string;
  description: string;
  category: string;
  status: "assigned" | "in_progress" | "completed" | "overdue" | null;
  slide_index: number;
  due_date: number | null;
};

const STATUS_LABEL: Record<NonNullable<LessonListItem["status"]>, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
};

const STATUS_CLASS: Record<NonNullable<LessonListItem["status"]>, string> = {
  assigned: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  overdue: "bg-red-50 text-red-700",
};

export function LessonItem({ lesson }: { lesson: LessonListItem }) {
  return (
    <Link
      href={`/lessons/${lesson._id}`}
      className="flex items-start gap-6 py-6 transition-colors hover:bg-provost-bg-muted/40"
    >
      <div className="flex h-[94px] w-[204px] flex-shrink-0 items-center justify-center rounded-[8px] bg-provost-bg-muted">
        <Icon name="school" size={36} weight={300} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[22px] font-bold leading-[1.26] tracking-[-0.88px] text-provost-text-primary">
          {lesson.title}
        </h3>
        <p className="mt-2 truncate text-[16px] font-light leading-[1.26] tracking-[-0.48px] text-provost-text-secondary">
          {lesson.description}
        </p>
        <div className="mt-3 flex items-center gap-2 text-[14px] tracking-[-0.42px] text-provost-neutral-600">
          <span className="font-light">{lesson.category}</span>
          {lesson.due_date && (
            <>
              <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-provost-neutral-600" />
              <span className="font-light">
                Due {new Date(lesson.due_date).toLocaleDateString()}
              </span>
            </>
          )}
          {lesson.status && (
            <>
              <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-provost-neutral-600" />
              <span
                className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_CLASS[lesson.status]}`}
              >
                {STATUS_LABEL[lesson.status]}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
