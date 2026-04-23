"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type Breadcrumb = {
  label: string;
  href?: string;
};

type BreadcrumbContextValue = {
  overrides: Breadcrumb[] | null;
  setOverrides: (crumbs: Breadcrumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Breadcrumb[] | null>(null);
  const value = useMemo<BreadcrumbContextValue>(() => ({ overrides, setOverrides }), [overrides]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbs(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    return { overrides: null, setOverrides: () => {} };
  }
  return ctx;
}
