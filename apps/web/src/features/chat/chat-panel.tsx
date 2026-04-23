"use client";

import type { RunEvent } from "@provost/schemas/runs";
import { ChatInput, ChatScroll } from "@provost/ui";
import type { ThreadState } from "@/entities/threads/thread";
import { getTurnsFromThread } from "@/entities/turn/helpers/get-turns-from-thread";
import { TurnView } from "./turn-view";

export type ChatPanelProps = {
  thread: ThreadState;
  events?: RunEvent[];
  isStreaming?: boolean;
  onSend: (text: string) => void;
  onApprove?: (toolCallId: string) => void;
  onReject?: (toolCallId: string) => void;
  placeholder?: string;
};

export function ChatPanel({
  thread,
  events,
  isStreaming = false,
  onSend,
  onApprove,
  onReject,
  placeholder,
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
        <div className="p-4">
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
