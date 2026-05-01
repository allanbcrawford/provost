"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDocumentSearch } from "./document-search-context";

/** Debounce delay for the search input. Per PRD §16.8 the bar updates
 * highlights as the user types; 150ms is the chosen ballpark to feel
 * instant without thrashing every keystroke through both tabs. */
const SEARCH_DEBOUNCE_MS = 150;

type Props = {
  onClose: () => void;
};

export function DocumentSearch({ onClose }: Props) {
  const { setSearchTerm } = useDocumentSearch();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Autofocus the input when the bar opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce → push to context.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft, setSearchTerm]);

  // Tear down the term when the bar unmounts.
  useEffect(() => {
    return () => setSearchTerm("");
  }, [setSearchTerm]);

  return (
    <div className="flex w-full items-center">
      <label
        htmlFor={inputId}
        className="flex h-9 w-full max-w-[360px] items-center gap-2 rounded-md border border-provost-border-default bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
      >
        <span className="material-symbols-outlined text-[18px] text-provost-text-tertiary">
          search
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Search this document…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-provost-text-primary outline-none placeholder:text-provost-text-tertiary"
          aria-label="Search this document"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="grid size-5 place-items-center rounded text-provost-text-tertiary hover:bg-neutral-100 hover:text-provost-text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </label>
    </div>
  );
}
