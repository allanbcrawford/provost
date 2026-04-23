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
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

export function LessonItem({ lesson }: { lesson: LessonListItem }) {
  return (
    <Link
      href={`/lessons/${lesson._id}`}
      className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Icon name="school" size={22} weight={400} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-medium text-neutral-900 text-sm">{lesson.title}</h3>
          {lesson.status && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[lesson.status]}`}
            >
              {STATUS_LABEL[lesson.status]}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-neutral-600 text-xs">{lesson.description}</p>
        <div className="mt-2 flex items-center gap-3 text-neutral-500 text-xs">
          <span>{lesson.category}</span>
          {lesson.due_date && <span>Due {new Date(lesson.due_date).toLocaleDateString()}</span>}
        </div>
      </div>
    </Link>
  );
}
