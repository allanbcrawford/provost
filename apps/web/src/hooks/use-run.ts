"use client";
import type { ToolSurface } from "@provost/agent";
import type { RunEvent } from "@provost/schemas/runs";
import { useMutation } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useRunEvents } from "./use-run-events";

type SendContext = {
  route?: ToolSurface;
  selection?: { kind: string; id: string } | null;
  visibleState?: Record<string, unknown>;
};

export function useRun(threadId: Id<"threads"> | null) {
  const [currentRunId, setCurrentRunId] = useState<Id<"thread_runs"> | null>(null);
  const startMut = useMutation(api.agent.run.start);
  const approveMut = useMutation(api.agent.approvals.approve);
  const rejectMut = useMutation(api.agent.approvals.reject);
  const events = useRunEvents(currentRunId) as unknown as RunEvent[];

  const send = useCallback(
    async (userMessage: string, ctx?: SendContext) => {
      if (!threadId) return;
      const { runId } = await startMut({
        threadId,
        userMessage,
        route: ctx?.route ?? "any",
        selection: ctx?.selection ?? null,
        visibleState: ctx?.visibleState,
      });
      setCurrentRunId(runId);
    },
    [threadId, startMut],
  );

  const approveToolCall = useCallback(
    async (toolCallId: string) => {
      await approveMut({ toolCallId });
    },
    [approveMut],
  );

  const rejectToolCall = useCallback(
    async (toolCallId: string, reason?: string) => {
      await rejectMut({ toolCallId, reason });
    },
    [rejectMut],
  );

  const isStreaming = useMemo(() => {
    if (events.length === 0) return false;
    return !events.some((e) => e.type === "run_finished" || e.type === "run_error");
  }, [events]);

  return { currentRunId, events, isStreaming, send, approveToolCall, rejectToolCall };
}
