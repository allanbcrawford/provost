"use client";

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
      <div className="rounded-lg border border-neutral-200 border-dashed bg-white p-8 text-center text-neutral-500 text-sm">
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {lessons.map((lesson) => (
        <li key={lesson._id}>
          <LessonItem lesson={lesson} />
        </li>
      ))}
    </ul>
  );
}
