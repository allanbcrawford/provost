"use client";

import type { RunEvent } from "@provost/schemas/runs";
import { ChatInput, ChatScroll } from "@provost/ui";
import { useEffect, useState } from "react";
import type { ThreadState } from "@/entities/threads/thread";
import { getTurnsFromThread } from "@/entities/turn/helpers/get-turns-from-thread";
import type { RateLimitNotice } from "@/hooks/use-run";
import { TurnView } from "./turn-view";

export type ChatPanelProps = {
  thread: ThreadState;
  events?: RunEvent[];
  isStreaming?: boolean;
  onSend: (text: string) => void;
  onApprove?: (toolCallId: string) => void;
  onReject?: (toolCallId: string) => void;
  placeholder?: string;
  rateLimit?: RateLimitNotice | null;
  onDismissRateLimit?: () => void;
};

function RateLimitBanner({
  notice,
  onDismiss,
}: {
  notice: RateLimitNotice;
  onDismiss?: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, notice.expiresAt - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(0, notice.expiresAt - Date.now());
      setRemainingMs(next);
      if (next === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [notice.expiresAt]);
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm"
    >
      <div className="font-medium">You're sending messages too quickly.</div>
      <div className="text-xs">
        Please wait {seconds}s before trying again.
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="ml-2 underline underline-offset-2">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  thread,
  events,
  isStreaming = false,
  onSend,
  onApprove,
  onReject,
  placeholder,
  rateLimit,
  onDismissRateLimit,
}: ChatPanelProps) {
  const turns = getTurnsFromThread(thread, events);
  const hasTurns = turns.length > 0;

  const hasPendingApproval = turns.some((turn) =>
    turn.toolCalls.some((tc) => tc.approval?.status === "requested"),
  );

  return (
    <ChatScroll
      className="h-full w-full"
      contentClassName="p-4 md:p-5 space-y-6"
      footer={
        <div className="space-y-2 p-4">
          {rateLimit && <RateLimitBanner notice={rateLimit} onDismiss={onDismissRateLimit} />}
          <ChatInput
            onSend={onSend}
            disabled={isStreaming}
            pendingApproval={hasPendingApproval}
            placeholder={
              placeholder ?? (isStreaming ? "Waiting for response..." : "Chat with Provost...")
            }
          />
        </div>
      }
    >
      {hasTurns ? (
        turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} onApprove={onApprove} onReject={onReject} />
        ))
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-provost-text-muted">
          <p className="font-medium text-lg text-provost-text-primary">Hi there</p>
          <p className="text-sm">Ask Provost anything about this family.</p>
        </div>
      )}
      {isStreaming && (
        <div className="flex items-center gap-2 text-provost-text-muted text-sm">
          <span className="flex gap-1">
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: "300ms" }}
            />
          </span>
          <span>Provost is thinking...</span>
        </div>
      )}
    </ChatScroll>
  );
}
