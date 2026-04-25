"use client";

import { useAuth } from "@clerk/nextjs";
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
  // Suppress the family during a *confirmed* signed-out state. During SSR
  // and Clerk's hydration window isSignedIn is undefined; we keep the
  // family available so server-seeded data (apps/web/src/app/(app)/layout.tsx)
  // and the cookie hint can render content on first paint. Only flip to
  // null once Clerk has actively reported signed-out — that's the window
  // where family-scoped Convex queries would otherwise fire with stale
  // identity and throw via requireFamilyMember.
  const { isSignedIn } = useAuth();
  const family = useContext(FamilyContext)?.family ?? null;
  return isSignedIn === false ? null : family;
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be inside <FamilyProvider>");
  return ctx;
}

export function useFamily(): { family: Family } {
  return { family: useSelectedFamily() };
}
