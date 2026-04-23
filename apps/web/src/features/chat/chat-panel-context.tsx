"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type ChatPanelContextValue = {
  openThreadId: string | null;
  setOpenThreadId: (id: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
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

  const value = useMemo<ChatPanelContextValue>(
    () => ({ openThreadId, setOpenThreadId, isOpen, setIsOpen }),
    [openThreadId, isOpen],
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
