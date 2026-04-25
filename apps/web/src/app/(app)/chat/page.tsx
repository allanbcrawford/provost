"use client";

// Full-screen chat mode. Same plumbing as the floating rail — useThread +
// useRun against a real Convex thread — but rendered as the page's main
// region instead of a 25vw aside. While this route is active, the floating
// chat rail collapses (see chat-panel-context.isFullScreen).

import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useSelectedFamily } from "@/context/family-context";
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
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const { openThreadId, setOpenThreadId } = useChatPanel();

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
      setOpenThreadId(sorted[0]!._id);
      return;
    }
    createThread({ familyId, title: "Provost" })
      .then(({ threadId }) => setOpenThreadId(threadId))
      .catch(() => {});
  }, [familyId, openThreadId, threads, createThread, setOpenThreadId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-provost-border-subtle bg-white px-6 py-4">
        <h1 className="font-dm-serif text-[28px] font-medium tracking-[-0.56px] text-provost-text-primary">
          Chat
        </h1>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {openThreadId ? (
            <FullScreenBody threadId={openThreadId as Id<"threads">} />
          ) : (
            <div className="p-8 text-[13px] text-provost-text-secondary">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FullScreenBody({ threadId }: { threadId: Id<"threads"> }) {
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
    return <div className="p-8 text-[13px] text-provost-text-secondary">Loading…</div>;
  }
  if (threadDoc === null) {
    return (
      <div className="p-8 text-[13px] text-provost-text-secondary">Conversation not found.</div>
    );
  }
  const thread = threadFromSchema(threadDoc as Parameters<typeof threadFromSchema>[0]);

  return (
    <ChatPanel
      thread={thread}
      events={events}
      isStreaming={isStreaming}
      onSend={(text, fileIds) => {
        void send(text, { fileIds });
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

export default withRoleGuard(ChatPage, APP_ROLES.HOME!);
