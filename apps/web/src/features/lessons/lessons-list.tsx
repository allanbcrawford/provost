"use client";

import { Fragment } from "react";
import { LessonItem, type LessonListItem } from "./lesson-item";

export function LessonsList({
  lessons,
  emptyMessage = "No lessons yet.",
}: {
  lessons: LessonListItem[];
  emptyMessage?: string;
}) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul className="flex flex-col">
      {lessons.map((lesson, idx) => (
        <Fragment key={lesson._id}>
          {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
          <li>
            <LessonItem lesson={lesson} />
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
