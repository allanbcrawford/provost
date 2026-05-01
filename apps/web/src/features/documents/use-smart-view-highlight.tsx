"use client";

import { Fragment, type ReactNode, useMemo } from "react";

/** Escape a user-supplied string so it can be safely embedded in a RegExp. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type SmartViewHighlightResult = {
  /** Rendered nodes with `<mark>` wrappers around matches. */
  nodes: ReactNode;
  /** Number of matches found across the input string. */
  count: number;
};

/**
 * Wraps every case-insensitive occurrence of `term` inside `text` with a
 * blue-highlighted `<mark>` element and reports the count. Empty term →
 * returns the original text and count 0 (no DOM churn).
 */
export function useSmartViewHighlight(text: string, term: string): SmartViewHighlightResult {
  return useMemo(() => {
    if (!term || term.length === 0 || !text) {
      return { nodes: text, count: 0 };
    }
    const pattern = new RegExp(escapeRegExp(term), "gi");
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let count = 0;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push(<Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex, start)}</Fragment>);
      }
      parts.push(
        <mark
          key={`m-${start}`}
          data-document-search-match
          className="rounded-sm bg-blue-200/60 px-[1px] text-provost-text-primary"
        >
          {text.slice(start, end)}
        </mark>,
      );
      lastIndex = end;
      count += 1;
      // Guard against zero-width matches from pathological inputs.
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
    if (lastIndex < text.length) {
      parts.push(<Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>);
    }
    return { nodes: parts, count };
  }, [text, term]);
}

/**
 * Pure helper (no React) for counting matches across many strings.
 * Used by the Document tab to derive its match count from the same
 * exact-text source as Smart View, so the two badges always agree
 * (PRD §16.8: "the numbers should always be equal to each other").
 */
export function countMatches(haystacks: readonly string[], term: string): number {
  if (!term || term.length === 0) return 0;
  const pattern = new RegExp(escapeRegExp(term), "gi");
  let total = 0;
  for (const text of haystacks) {
    if (!text) continue;
    pattern.lastIndex = 0;
    while (pattern.exec(text) !== null) {
      total += 1;
      if (pattern.lastIndex === 0) break; // safety
    }
  }
  return total;
}
