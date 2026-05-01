"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type DocumentSearchContextValue = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  /**
   * Total exact-text matches across the document. Per PRD §16.8 the Smart
   * View tab and Document tab badges always equal each other, so they read
   * the same number from this single field.
   */
  matchCount: number;
  setMatchCount: (n: number) => void;
  isActive: boolean;
};

const DocumentSearchContext = createContext<DocumentSearchContextValue | null>(null);

type DocumentSearchProviderProps = {
  children: React.ReactNode;
};

/**
 * Wraps the document detail surface so both the Smart View tab and the
 * Document (PDF) tab can read/write the active search term and the shared
 * match count. The header reads `matchCount` to render per-tab badges.
 */
export function DocumentSearchProvider({ children }: DocumentSearchProviderProps) {
  const [searchTerm, setSearchTermState] = useState("");
  const [matchCount, setMatchCount] = useState(0);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    if (term.length === 0) setMatchCount(0);
  }, []);

  const value = useMemo<DocumentSearchContextValue>(
    () => ({
      searchTerm,
      setSearchTerm,
      matchCount,
      setMatchCount,
      isActive: searchTerm.length > 0,
    }),
    [searchTerm, setSearchTerm, matchCount],
  );

  return (
    <DocumentSearchContext.Provider value={value}>{children}</DocumentSearchContext.Provider>
  );
}

export function useDocumentSearch(): DocumentSearchContextValue {
  const ctx = useContext(DocumentSearchContext);
  if (!ctx) {
    throw new Error("useDocumentSearch must be used inside <DocumentSearchProvider>");
  }
  return ctx;
}
