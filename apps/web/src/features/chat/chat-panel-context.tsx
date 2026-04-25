"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type ChatPanelContextValue = {
  openThreadId: string | null;
  setOpenThreadId: (id: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  // True while the user is on the dedicated /chat route. Floating rail is
  // hidden in this mode so the two surfaces don't render the same thread
  // twice. Computed from the route, not toggled — the URL is the source of
  // truth.
  isFullScreen: boolean;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export type ChatPanelProviderProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultThreadId?: string | null;
};

export function ChatPanelProvider({
  children,
  defaultOpen = false,
  defaultThreadId = null,
}: ChatPanelProviderProps) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(defaultThreadId);
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const pathname = usePathname();
  const isFullScreen = pathname === "/chat" || pathname.startsWith("/chat/");

  const value = useMemo<ChatPanelContextValue>(
    () => ({ openThreadId, setOpenThreadId, isOpen, setIsOpen, isFullScreen }),
    [openThreadId, isOpen, isFullScreen],
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelContextValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error("useChatPanel must be used within a ChatPanelProvider");
  }
  return ctx;
}
