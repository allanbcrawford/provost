"use client";

import type { Preloaded } from "convex/react";
import { createContext, type ReactNode, useContext } from "react";
import type { api } from "../../../../convex/_generated/api";

// Carries SSR-preloaded Convex query payloads from the (app) layout server
// component into shell-level client consumers, so they can call
// usePreloadedQuery on first render instead of waiting for client-side
// auth attach + initial subscription. Each slot is optional — null means
// "no preload available, fall back to your normal useQuery".

type PreloadedThreadsList = Preloaded<typeof api.threads.list>;

type PreloadedDataValue = {
  threads: PreloadedThreadsList | null;
};

const PreloadedDataContext = createContext<PreloadedDataValue>({ threads: null });

export function PreloadedDataProvider({
  children,
  threads,
}: {
  children: ReactNode;
  threads: PreloadedThreadsList | null;
}) {
  return (
    <PreloadedDataContext.Provider value={{ threads }}>{children}</PreloadedDataContext.Provider>
  );
}

export function usePreloadedThreads(): PreloadedThreadsList | null {
  return useContext(PreloadedDataContext).threads;
}
