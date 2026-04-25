"use client";

import type { Preloaded } from "convex/react";
import { createContext, type ReactNode, useContext } from "react";
import type { api } from "../../../../../../convex/_generated/api";

type PreloadedFamilyGraph = Preloaded<typeof api.family.getGraph>;

const FamilyGraphContext = createContext<PreloadedFamilyGraph | null>(null);

export function PreloadedFamilyGraphProvider({
  children,
  preloaded,
}: {
  children: ReactNode;
  preloaded: PreloadedFamilyGraph | null;
}) {
  return <FamilyGraphContext.Provider value={preloaded}>{children}</FamilyGraphContext.Provider>;
}

export function usePreloadedFamilyGraph(): PreloadedFamilyGraph | null {
  return useContext(FamilyGraphContext);
}
