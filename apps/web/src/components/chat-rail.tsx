"use client";

// FLOATING CHAT MODE — right-rail panel, opened/closed via the header's chat
// toggle. PRD also calls for a separate FULL-SCREEN mode (triggered by a (+)
// icon in the header) with its own thread history and a "Chatting…" header
// label that disables the floating mode while active. The full-screen mode
// is not implemented yet — see P3.2 follow-up. Today this rail uses a stub
// thread; wiring real threads is a prerequisite for both modes.
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
