"use client";

import { emptyThread } from "@/entities/threads/thread";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useChatPanel } from "@/features/chat/chat-panel-context";

export function ChatRail() {
  const { isOpen } = useChatPanel();

  const thread = emptyThread("stub-thread", "stub-family");

  return (
    <aside
      className={`
        shrink-0 border-l border-provost-border-subtle bg-white
        flex h-full overflow-hidden
        transition-[width] duration-200 ease-in-out
        ${isOpen ? "w-[clamp(300px,25vw,400px)]" : "w-0 border-l-0"}
      `}
    >
      <div
        className={`
          flex flex-col h-full w-full overflow-hidden
          transition-opacity duration-150
          ${isOpen ? "delay-150 opacity-100" : "opacity-0 delay-0 pointer-events-none"}
        `}
      >
        <ChatPanel thread={thread} events={[]} isStreaming={false} onSend={() => {}} />
      </div>
    </aside>
  );
}
