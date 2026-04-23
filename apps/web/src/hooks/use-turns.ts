"use client";
import type { RunEvent } from "@provost/schemas/runs";
import type { Thread as ThreadSchema } from "@provost/schemas/threads";
import { useMemo } from "react";
import { applyEvents, threadFromSchema } from "@/entities/threads/thread";
import { getTurnsFromThread } from "@/entities/turn/helpers/get-turns-from-thread";

export function useTurns(thread: ThreadSchema | null | undefined, events: RunEvent[]) {
  return useMemo(() => {
    if (!thread) return [];
    const applied = applyEvents(threadFromSchema(thread), events);
    return getTurnsFromThread(applied);
  }, [thread, events]);
}
