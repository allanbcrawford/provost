"use client";
import type { RunEvent } from "@provost/schemas/runs";
import { useEffect } from "react";
import { useWidgetPortal } from "@/context/widget-portal-context";

const WIDGET_SLOT_MAP: Record<string, string> = {
  navigate: "inline",
  form: "inline",
  waterfall: "family-page",
  graph: "family-page",
  "graph-focus": "family-page",
  "draft-revision": "inline",
  cite: "inline",
  task: "inline",
};

export function useWidgetDispatcher(events: RunEvent[]) {
  const portal = useWidgetPortal();
  useEffect(() => {
    const latest = events[events.length - 1];
    if (!latest || latest.type !== "tool_call_finished") return;
    const widget = (latest.data as { widget?: { kind: string; props: unknown } }).widget;
    if (!widget) return;
    const slot = WIDGET_SLOT_MAP[widget.kind] ?? "inline";
    if (slot === "inline") return;
    portal.push(slot, { kind: widget.kind, props: widget.props });
  }, [events, portal]);
}
