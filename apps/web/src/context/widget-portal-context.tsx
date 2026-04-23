"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type WidgetPayload = { kind: string; props: unknown; sourceToolCallId?: string };

type PortalState = Record<string, WidgetPayload | null>;

type Ctx = {
  get: (slotId: string) => WidgetPayload | null;
  push: (slotId: string, payload: WidgetPayload) => void;
  clear: (slotId: string) => void;
};

const PortalContext = createContext<Ctx | null>(null);

export function WidgetPortalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortalState>({});
  const get = useCallback((slotId: string) => state[slotId] ?? null, [state]);
  const push = useCallback(
    (slotId: string, payload: WidgetPayload) => setState((s) => ({ ...s, [slotId]: payload })),
    [],
  );
  const clear = useCallback((slotId: string) => setState((s) => ({ ...s, [slotId]: null })), []);
  const value = useMemo(() => ({ get, push, clear }), [get, push, clear]);
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function useWidgetPortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("useWidgetPortal must be inside <WidgetPortalProvider>");
  return ctx;
}

export function useWidgetSlot(slotId: string) {
  const { get, clear } = useWidgetPortal();
  return { widget: get(slotId), clear: () => clear(slotId) };
}
