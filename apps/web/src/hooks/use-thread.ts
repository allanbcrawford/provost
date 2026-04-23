"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useThread(threadId: Id<"threads"> | null) {
  return useQuery(api.threads.get, threadId ? { threadId } : "skip");
}
