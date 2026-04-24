"use client";
import type { ToolSurface } from "@provost/agent";
import type { RunEvent } from "@provost/schemas/runs";
import * as Sentry from "@sentry/nextjs";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useRunEvents } from "./use-run-events";

type SendContext = {
  route?: ToolSurface;
  selection?: { kind: string; id: string } | null;
  visibleState?: Record<string, unknown>;
  fileIds?: Id<"files">[];
};

export type RateLimitNotice = {
  bucket: string;
  max: number;
  windowMs: number;
  retryAfterMs: number;
  expiresAt: number;
};

function extractRateLimit(err: unknown): RateLimitNotice | null {
  if (err instanceof ConvexError) {
    const data = err.data as
      | { code?: string; bucket?: string; max?: number; windowMs?: number; retryAfterMs?: number }
      | undefined;
    if (data && data.code === "RATE_LIMIT") {
      const retryAfterMs = data.retryAfterMs ?? data.windowMs ?? 60_000;
      return {
        bucket: data.bucket ?? "unknown",
        max: data.max ?? 0,
        windowMs: data.windowMs ?? 60_000,
        retryAfterMs,
        expiresAt: Date.now() + retryAfterMs,
      };
    }
  }
  return null;
}

export function useRun(threadId: Id<"threads"> | null) {
  const [currentRunId, setCurrentRunId] = useState<Id<"thread_runs"> | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitNotice | null>(null);
  const startMut = useMutation(api.agent.run.start);
  const approveMut = useMutation(api.agent.approvals.approve);
  const rejectMut = useMutation(api.agent.approvals.reject);
  const events = useRunEvents(currentRunId) as unknown as RunEvent[];

  const send = useCallback(
    async (userMessage: string, ctx?: SendContext) => {
      if (!threadId) return;
      try {
        const { runId } = await startMut({
          threadId,
          userMessage,
          route: ctx?.route ?? "any",
          selection: ctx?.selection ?? null,
          visibleState: ctx?.visibleState,
          fileIds: ctx?.fileIds,
        });
        setRateLimit(null);
        setCurrentRunId(runId);
      } catch (err) {
        const notice = extractRateLimit(err);
        if (notice) {
          setRateLimit(notice);
          return;
        }
        throw err;
      }
    },
    [threadId, startMut],
  );

  const dismissRateLimit = useCallback(() => setRateLimit(null), []);

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

  // Phase I: surface Convex-side run failures to Sentry. The run loop runs in
  // a Convex action that can't talk to @sentry/nextjs directly, so we bridge
  // the run_error events back through the client.
  const reportedRunErrors = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentRunId) return;
    for (const e of events) {
      if (e.type !== "run_error") continue;
      const key = `${currentRunId}:${e.sequence}`;
      if (reportedRunErrors.current.has(key)) continue;
      reportedRunErrors.current.add(key);
      const data = (e.data ?? {}) as { error?: string; message?: string };
      const message = data.error ?? data.message ?? "run_error";
      Sentry.captureMessage(`Provost run_error: ${message}`, {
        level: "error",
        tags: { component: "provost.run", runId: currentRunId },
        extra: { runId: currentRunId, sequence: e.sequence, data: e.data },
      });
    }
  }, [events, currentRunId]);

  return {
    currentRunId,
    events,
    isStreaming,
    send,
    approveToolCall,
    rejectToolCall,
    rateLimit,
    dismissRateLimit,
  };
}
