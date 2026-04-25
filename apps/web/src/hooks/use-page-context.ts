"use client";

// Registers what the current page/component is "showing" with the chat
// panel context, so the agent's send() call can include a selection
// ({kind, id}) and arbitrary visibleState describing the on-screen view.
//
// Each call to this hook owns a unique token; the chat panel maintains a
// stack and the topmost token wins. Re-registering with new ctx updates
// in place. Unmount cleans up.
//
// Selection identity stability: callers should pass either a stable
// reference for `selection`/`visibleState` or accept that updates fire on
// every render. We deep-compare via JSON.stringify of the inputs to skip
// no-op updates and avoid infinite render loops.

import { useEffect, useRef } from "react";
import {
  type PageSelection,
  type PageVisibleState,
  useChatPanel,
} from "@/features/chat/chat-panel-context";

export type UsePageContextArgs = {
  selection?: PageSelection;
  visibleState?: PageVisibleState;
  // When false, the hook becomes a no-op. Useful for deferring registration
  // until data has loaded (so we don't register {kind, id: ""}).
  enabled?: boolean;
};

export function usePageContext({ selection, visibleState, enabled = true }: UsePageContextArgs) {
  const { registerPageContext, updatePageContext, unregisterPageContext } = useChatPanel();
  const tokenRef = useRef<symbol | null>(null);
  const lastSerializedRef = useRef<string | null>(null);

  // Acquire a token on first enabled render, release on unmount.
  useEffect(() => {
    if (!enabled) return;
    const token = Symbol("page-context");
    tokenRef.current = token;
    return () => {
      unregisterPageContext(token);
      tokenRef.current = null;
      lastSerializedRef.current = null;
    };
  }, [enabled, unregisterPageContext]);

  // Push current ctx into the stack whenever it changes.
  useEffect(() => {
    if (!enabled) return;
    const token = tokenRef.current;
    if (!token) return;
    const ctx = {
      selection: selection ?? null,
      visibleState,
    };
    let serialized: string;
    try {
      serialized = JSON.stringify(ctx);
    } catch {
      // visibleState contained a circular structure or non-serializable
      // value. Fall back to an identity-based update so we still publish
      // something rather than throwing.
      serialized = `${Math.random()}`;
    }
    if (serialized === lastSerializedRef.current) return;
    const isFirst = lastSerializedRef.current === null;
    lastSerializedRef.current = serialized;
    if (isFirst) {
      registerPageContext(token, ctx);
    } else {
      updatePageContext(token, ctx);
    }
  }, [enabled, selection, visibleState, registerPageContext, updatePageContext]);
}
