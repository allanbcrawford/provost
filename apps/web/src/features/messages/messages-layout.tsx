"use client";

import type { ReactNode } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Props = {
  /** Left column content — thread list (tabs, search, list, compose CTA). */
  leftColumn: ReactNode;
  /** Middle column content — reading pane (thread view + reply composer or empty state). */
  children: ReactNode;
  /** Currently selected thread, used to drive responsive 1-col view. */
  selectedThreadId: Id<"message_threads"> | null;
};

/**
 * Two-column layout for the messages page (list + reading pane).
 * The third visual column is the global ChatRail rendered by the app layout.
 *
 * Responsive behavior:
 *  - lg (>=1024px): side-by-side list + reading pane (left fixed 320px, middle flex)
 *  - <lg: single column. Show list when nothing is selected, reading pane otherwise.
 */
export function MessagesLayout({ leftColumn, children, selectedThreadId }: Props) {
  const showList = selectedThreadId === null;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <aside
        className={`${showList ? "block" : "hidden"} lg:block`}
        aria-label="Message threads"
      >
        {leftColumn}
      </aside>
      <section
        className={`${showList ? "hidden" : "block"} lg:block min-w-0`}
        aria-label="Selected conversation"
      >
        {children}
      </section>
    </div>
  );
}
