"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// What the user is currently looking at. Threaded through the chat send()
// path so the agent can answer questions like "what's wrong with this
// document?" without the user having to re-state the subject.
export type PageSelection = { kind: string; id: string } | null;
export type PageVisibleState = Record<string, unknown> | undefined;

export type PageContext = {
  selection: PageSelection;
  visibleState: PageVisibleState;
};

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
  // Current page-level selection + visible state, derived from the topmost
  // (most-recently-mounted) registration. Components register via
  // usePageContext; chat surfaces read this value when calling send().
  pageContext: PageContext;
  // Registration API. Returns a stable token used by the unregister call.
  // Implementation detail — prefer the usePageContext hook.
  registerPageContext: (token: symbol, ctx: PageContext) => void;
  updatePageContext: (token: symbol, ctx: PageContext) => void;
  unregisterPageContext: (token: symbol) => void;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export type ChatPanelProviderProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultThreadId?: string | null;
};

const EMPTY_PAGE_CONTEXT: PageContext = { selection: null, visibleState: undefined };

export function ChatPanelProvider({
  children,
  defaultOpen = false,
  defaultThreadId = null,
}: ChatPanelProviderProps) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(defaultThreadId);
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const pathname = usePathname();
  const isFullScreen = pathname === "/chat" || pathname.startsWith("/chat/");

  // Stack of registered page contexts. The last entry wins — this matches
  // the natural mount order: a deeper detail panel mounted on top of a list
  // page should be the active context until it unmounts.
  const stackRef = useRef<Array<{ token: symbol; ctx: PageContext }>>([]);
  const [pageContext, setPageContext] = useState<PageContext>(EMPTY_PAGE_CONTEXT);

  const recompute = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    setPageContext(top ? top.ctx : EMPTY_PAGE_CONTEXT);
  }, []);

  const registerPageContext = useCallback(
    (token: symbol, ctx: PageContext) => {
      stackRef.current = [...stackRef.current.filter((e) => e.token !== token), { token, ctx }];
      recompute();
    },
    [recompute],
  );

  const updatePageContext = useCallback(
    (token: symbol, ctx: PageContext) => {
      const idx = stackRef.current.findIndex((e) => e.token === token);
      if (idx === -1) {
        stackRef.current = [...stackRef.current, { token, ctx }];
      } else {
        const next = stackRef.current.slice();
        next[idx] = { token, ctx };
        stackRef.current = next;
      }
      recompute();
    },
    [recompute],
  );

  const unregisterPageContext = useCallback(
    (token: symbol) => {
      stackRef.current = stackRef.current.filter((e) => e.token !== token);
      recompute();
    },
    [recompute],
  );

  const value = useMemo<ChatPanelContextValue>(
    () => ({
      openThreadId,
      setOpenThreadId,
      isOpen,
      setIsOpen,
      isFullScreen,
      pageContext,
      registerPageContext,
      updatePageContext,
      unregisterPageContext,
    }),
    [
      openThreadId,
      isOpen,
      isFullScreen,
      pageContext,
      registerPageContext,
      updatePageContext,
      unregisterPageContext,
    ],
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
