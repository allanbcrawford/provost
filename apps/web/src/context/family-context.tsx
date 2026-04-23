"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

export type Family = { _id: Id<"families">; name: string; myRole: string } | null;

type FamilyContextValue = {
  family: Family;
  setFamily: (f: Family) => void;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({
  children,
  initialFamily = null,
}: {
  children: ReactNode;
  initialFamily?: Family;
}) {
  const [family, setFamily] = useState<Family>(initialFamily);
  const value = useMemo<FamilyContextValue>(() => ({ family, setFamily }), [family]);
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useSelectedFamily(): Family {
  return useContext(FamilyContext)?.family ?? null;
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be inside <FamilyProvider>");
  return ctx;
}

export function useFamily(): { family: Family } {
  return { family: useSelectedFamily() };
}
