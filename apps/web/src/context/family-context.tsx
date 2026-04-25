"use client";

import { useConvexAuth } from "convex/react";
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
  // Returns the family for rendering shell chrome (header label, sidebar,
  // SSR-seeded content). NOT safe for gating Convex queries — the family
  // can be present while Convex auth is still attaching (initial hydration)
  // or already cleared (sign-out). For query args use useFamilyQueryArgs.
  return useContext(FamilyContext)?.family ?? null;
}

// Returns the family only when Convex has validated the auth token.
// Use this for every useQuery callsite gated on family — when auth isn't
// ready (initial hydration, sign-in flight, or after sign-out) it returns
// null so the existing `family ? {familyId} : "skip"` pattern correctly
// skips. Without this gate, queries fire unauthenticated during the
// window where Clerk has attached identity but Convex hasn't validated
// the token yet (or after sign-out before Convex re-evaluates), and
// requireFamilyMember throws ConvexError({code:"UNAUTHENTICATED"}) —
// which bubbles past every "skip"-pattern callsite to global-error.tsx.
export function useAuthedFamily(): Family {
  const { isAuthenticated } = useConvexAuth();
  const family = useContext(FamilyContext)?.family ?? null;
  return isAuthenticated ? family : null;
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be inside <FamilyProvider>");
  return ctx;
}

export function useFamily(): { family: Family } {
  return { family: useSelectedFamily() };
}
