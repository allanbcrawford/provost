"use client";

// Full-screen chat mode. Same plumbing as the floating rail — useThread +
// useRun against a real Convex thread — but rendered as the page's main
// region instead of a 25vw aside. While this route is active, the floating
// chat rail collapses (see chat-panel-context.isFullScreen).

import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { threadFromSchema } from "@/entities/threads/thread";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { useRun } from "@/hooks/use-run";
import { useThread } from "@/hooks/use-thread";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function ChatPage() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const { openThreadId, setOpenThreadId, pageContext } = useChatPanel();

  const threads = useQuery(api.threads.list, familyId ? { familyId } : "skip") as
    | Array<{ _id: Id<"threads">; title: string | null; _creationTime: number }>
    | undefined;
  const createThread = useMutation(api.threads.create);

  // Same default-thread plumbing as the rail. Reuses the rail's selection if
  // one is already in context (so opening /chat while the rail had a thread
  // open keeps you on that thread).
  useEffect(() => {
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
  }, [familyId, openThreadId, threads, createThread, setOpenThreadId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-provost-border-subtle border-b bg-white px-6 py-4">
        <h1 className="font-dm-serif font-medium text-[28px] text-provost-text-primary tracking-[-0.56px]">
          Chat
        </h1>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {openThreadId ? (
            <FullScreenBody
              threadId={openThreadId as Id<"threads">}
              selection={pageContext.selection}
              visibleState={pageContext.visibleState}
            />
          ) : (
            <div className="p-8 text-[13px] text-provost-text-secondary">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function deriveTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned || "Untitled";
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

function FullScreenBody({
  threadId,
  selection,
  visibleState,
}: {
  threadId: Id<"threads">;
  selection: { kind: string; id: string } | null;
  visibleState: Record<string, unknown> | undefined;
}) {
  const threadDoc = useThread(threadId);
  const renameThread = useMutation(api.threads.rename);
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
    return <div className="p-8 text-[13px] text-provost-text-secondary">Loading…</div>;
  }
  if (threadDoc === null) {
    return (
      <div className="p-8 text-[13px] text-provost-text-secondary">Conversation not found.</div>
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
        if (isUntitled && text.trim()) {
          void renameThread({ threadId, title: deriveTitle(text) }).catch(() => {});
        }
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

export default withRoleGuard(ChatPage, APP_ROLES.HOME ?? []);
