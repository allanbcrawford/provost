"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useRunEvents(threadRunId: Id<"thread_runs"> | null) {
  return useQuery(api.runs.getEvents, threadRunId ? { threadRunId } : "skip") ?? [];
}
