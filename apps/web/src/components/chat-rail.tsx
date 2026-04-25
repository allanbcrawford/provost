"use client";

// Floating-mode chat rail. Wires a real Convex thread (creates one on demand
// if the user has none yet) so chat sends actually run the agent. Full-screen
// mode lives at /chat — when that route is active, this rail is hidden by the
// chat-panel-context.

import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { threadFromSchema } from "@/entities/threads/thread";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { useRun } from "@/hooks/use-run";
import { useThread } from "@/hooks/use-thread";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function ChatRail() {
  const { isOpen, isFullScreen, openThreadId, setOpenThreadId, pageContext } = useChatPanel();
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;

  const threads = useQuery(api.threads.list, familyId ? { familyId } : "skip") as
    | Array<{ _id: Id<"threads">; title: string | null; _creationTime: number }>
    | undefined;
  const createThread = useMutation(api.threads.create);
  const renameThread = useMutation(api.threads.rename);

  // Pick the most-recent thread on first mount. If the user has none, create
  // one. Idempotent because we only fire when openThreadId is null and the
  // query result has settled.
  useEffect(() => {
    if (!isOpen || isFullScreen) return;
    if (!familyId) return;
    if (openThreadId) return;
    if (threads === undefined) return;
    if (threads.length > 0) {
      const sorted = [...threads].sort((a, b) => b._creationTime - a._creationTime);
      setOpenThreadId(sorted[0]?._id ?? null);
      return;
    }
    createThread({ familyId, title: "Provost" })
      .then(({ threadId }) => setOpenThreadId(threadId))
      .catch(() => {});
  }, [isOpen, isFullScreen, familyId, openThreadId, threads, createThread, setOpenThreadId]);

  // While the full-screen page owns chat, the rail collapses to width 0
  // regardless of isOpen — PRD: "disables the floating mode while active."
  const railVisible = isOpen && !isFullScreen;

  return (
    <aside
      className={`flex h-full shrink-0 overflow-hidden border-provost-border-subtle border-l bg-white transition-[width] duration-200 ease-in-out ${railVisible ? "w-[clamp(300px,25vw,400px)]" : "w-0 border-l-0"}
      `}
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden transition-opacity duration-150 ${railVisible ? "opacity-100 delay-150" : "pointer-events-none opacity-0 delay-0"}
        `}
      >
        {railVisible && openThreadId ? (
          <RailBody
            threadId={openThreadId as Id<"threads">}
            selection={pageContext.selection}
            visibleState={pageContext.visibleState}
            onMaybeAutoTitle={(text) => {
              void renameThread({
                threadId: openThreadId as Id<"threads">,
                title: deriveTitle(text),
              }).catch(() => {});
            }}
          />
        ) : (
          <div className="p-4 text-[13px] text-provost-text-secondary">Loading…</div>
        )}
      </div>
    </aside>
  );
}

// Title heuristic: trim, collapse whitespace, cap to ~60 chars on a word
// boundary. Keeps the sidebar list readable without an LLM round-trip.
function deriveTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned || "Untitled";
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

function RailBody({
  threadId,
  selection,
  visibleState,
  onMaybeAutoTitle,
}: {
  threadId: Id<"threads">;
  selection: { kind: string; id: string } | null;
  visibleState: Record<string, unknown> | undefined;
  onMaybeAutoTitle: (firstMessage: string) => void;
}) {
  const threadDoc = useThread(threadId);
  const {
    send,
    events,
    isStreaming,
    rateLimit,
    dismissRateLimit,
    approveToolCall,
    rejectToolCall,
  } = useRun(threadId);

  if (threadDoc === undefined) {
    return <div className="p-4 text-[13px] text-provost-text-secondary">Loading…</div>;
  }
  if (threadDoc === null) {
    return (
      <div className="p-4 text-[13px] text-provost-text-secondary">Conversation not found.</div>
    );
  }
  const thread = threadFromSchema(threadDoc as Parameters<typeof threadFromSchema>[0]);
  const isUntitled = !thread.title?.trim() || thread.title.trim() === "Provost";

  return (
    <ChatPanel
      thread={thread}
      events={events}
      isStreaming={isStreaming}
      onSend={(text, fileIds) => {
        if (isUntitled && text.trim()) onMaybeAutoTitle(text);
        void send(text, { fileIds, selection, visibleState });
      }}
      onApprove={(toolCallId) => {
        void approveToolCall(toolCallId);
      }}
      onReject={(toolCallId) => {
        void rejectToolCall(toolCallId);
      }}
      rateLimit={rateLimit}
      onDismissRateLimit={dismissRateLimit}
    />
  );
}
