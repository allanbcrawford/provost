"use client";

import { Button, Icon } from "@provost/ui";
import { emptyThread } from "@/entities/threads/thread";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useChatPanel } from "@/features/chat/chat-panel-context";

export function ChatRail() {
  const { isOpen, setIsOpen } = useChatPanel();
  if (!isOpen) return null;

  const thread = emptyThread("stub-thread", "stub-family");

  return (
    <aside className="flex h-full w-[440px] shrink-0 flex-col border-neutral-200 border-l bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between border-neutral-200 border-b px-4">
        <div className="flex items-center gap-2">
          <Icon name="chat" size={18} />
          <span className="font-medium text-sm">Chat</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close chat"
          onClick={() => setIsOpen(false)}
        >
          <Icon name="close" size={18} />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatPanel thread={thread} events={[]} isStreaming={false} onSend={() => {}} />
      </div>
    </aside>
  );
}
