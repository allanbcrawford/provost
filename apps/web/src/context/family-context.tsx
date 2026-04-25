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
  // Gate the family on Clerk's signed-in state. During sign-out the family
  // can briefly remain in context after Clerk has cleared identity, which
  // would otherwise let family-scoped Convex queries fire unauthenticated
  // and throw (e.g. requireFamilyMember). On sign-in, gate the same way
  // until Clerk has finished hydrating, so the cookie-seeded family doesn't
  // surface before ConvexProviderWithClerk has attached the user's token.
  const { isSignedIn } = useAuth();
  const family = useContext(FamilyContext)?.family ?? null;
  return isSignedIn ? family : null;
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be inside <FamilyProvider>");
  return ctx;
}

export function useFamily(): { family: Family } {
  return { family: useSelectedFamily() };
}
