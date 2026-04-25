"use client";

import { useUser } from "@clerk/nextjs";
import type { RunEvent } from "@provost/schemas/runs";
import { ChatScroll } from "@provost/ui";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ThreadState } from "@/entities/threads/thread";
import { getTurnsFromThread } from "@/entities/turn/helpers/get-turns-from-thread";
import type { RateLimitNotice } from "@/hooks/use-run";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ChatPanelEmptyState } from "./chat-panel-empty-state";
import { ChatPanelInput } from "./chat-panel-input";
import { TurnView } from "./turn-view";

export type ChatPanelProps = {
  thread: ThreadState;
  events?: RunEvent[];
  isStreaming?: boolean;
  onSend: (text: string, fileIds?: Id<"files">[]) => void;
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
  const { user } = useUser();
  const pathname = usePathname();
  const turns = getTurnsFromThread(thread, events);
  const hasTurns = turns.length > 0;

  const hasPendingApproval = turns.some((turn) =>
    turn.toolCalls.some((tc) => tc.approval?.status === "requested"),
  );

  return (
    <ChatScroll
      className="h-full w-full"
      contentClassName={hasTurns ? "p-4 md:p-5 space-y-6" : ""}
      footer={
        <div className="space-y-2 p-4">
          {rateLimit && <RateLimitBanner notice={rateLimit} onDismiss={onDismissRateLimit} />}
          <ChatPanelInput
            onSend={onSend}
            disabled={isStreaming || hasPendingApproval}
            placeholder={
              placeholder ?? (isStreaming ? "Waiting for response..." : "Chat with Provost...")
            }
            contextRoute={pathname ?? undefined}
          />
        </div>
      }
    >
      {hasTurns ? (
        turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} onApprove={onApprove} onReject={onReject} />
        ))
      ) : (
        <ChatPanelEmptyState
          firstName={user?.firstName ?? undefined}
          onSelectSuggestion={(text) => onSend(text)}
        />
      )}
      {isStreaming && (
        <div className="flex items-center gap-2 px-4 pb-2 text-provost-text-muted text-sm">
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
