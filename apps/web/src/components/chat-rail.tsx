"use client";

// Floating-mode chat rail. Wires a real Convex thread (creates one on demand
// if the user has none yet) so chat sends actually run the agent. Full-screen
// mode lives at /chat — when that route is active, this rail is hidden by the
// chat-panel-context.

import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { usePreloadedThreads } from "@/context/preloaded-data-context";
import { threadFromSchema } from "@/entities/threads/thread";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { useRun } from "@/hooks/use-run";
import { useThread } from "@/hooks/use-thread";
import { AuthedPreloadedQuery } from "@/lib/authed-preloaded-query";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ThreadRow = { _id: Id<"threads">; title: string | null; _creationTime: number };

export function ChatRail() {
  const preloaded = usePreloadedThreads();
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;

  // Two paths into ChatRailInner: SSR-preloaded threads (refresh case — data
  // already in the HTML) vs live useQuery (first sign-in / post-bootstrap).
  // We can't conditionally call usePreloadedQuery, so split into siblings.
  if (preloaded) return <PreloadedChatRail preloaded={preloaded} familyId={familyId} />;
  return <LiveChatRail familyId={familyId} />;
}

function PreloadedChatRail({
  preloaded,
  familyId,
}: {
  preloaded: NonNullable<ReturnType<typeof usePreloadedThreads>>;
  familyId: Id<"families"> | undefined;
}) {
  return (
    <AuthedPreloadedQuery preloaded={preloaded}>
      {(threads) => <ChatRailInner threads={threads as ThreadRow[]} familyId={familyId} />}
    </AuthedPreloadedQuery>
  );
}

function LiveChatRail({ familyId }: { familyId: Id<"families"> | undefined }) {
  const threads = useQuery(api.threads.list, familyId ? { familyId } : "skip") as
    | ThreadRow[]
    | undefined;
  return <ChatRailInner threads={threads} familyId={familyId} />;
}

function ChatRailInner({
  threads,
  familyId,
}: {
  threads: ThreadRow[] | undefined;
  familyId: Id<"families"> | undefined;
}) {
  const { isOpen, isFullScreen, openThreadId, setOpenThreadId, pageContext } = useChatPanel();
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
