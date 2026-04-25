"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type LessonListItem = {
  _id: Id<"lessons">;
  title: string;
  description: string;
  category: string;
  // Status vocabulary spans legacy + P0b values during the migration window.
  // Display layer collapses them into "Recommended" / "Up next" / "Completed".
  status:
    | "assigned"
    | "in_progress"
    | "completed"
    | "overdue"
    | "locked"
    | "active"
    | "complete"
    | "advanced"
    | null;
  slide_index: number;
  // due_date kept on the type only because legacy `lessons.list` still
  // returns it; we no longer surface it in the UI per PRD ("avoid 'due date'
  // language; frame as personalized recommendations").
  due_date?: number | null;
};

function statusDisplay(status: NonNullable<LessonListItem["status"]>): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
    case "assigned":
    case "in_progress":
      return { label: "Up next", className: "bg-amber-50 text-amber-800" };
    case "complete":
    case "completed":
    case "advanced":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-800" };
    case "locked":
      return { label: "Locked", className: "bg-provost-neutral-100 text-provost-neutral-600" };
    case "overdue":
      // Legacy value — display as "Up next" rather than "Overdue" per new copy.
      return { label: "Up next", className: "bg-amber-50 text-amber-800" };
  }
}

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
          {lesson.status && (
            <>
              <span
                aria-hidden
                className="size-[3px] shrink-0 rounded-full bg-provost-neutral-600"
              />
              {(() => {
                const d = statusDisplay(lesson.status);
                return (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${d.className}`}
                  >
                    {d.label}
                  </span>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
