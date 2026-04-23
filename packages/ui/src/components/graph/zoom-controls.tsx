"use client";

import { Panel, useReactFlow, useViewport } from "@xyflow/react";

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);

  const btn =
    "flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-provost-border-subtle shadow-sm hover:bg-provost-bg-muted transition-colors";

  return (
    <Panel position="bottom-right" className="m-3 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        aria-label="Zoom in"
        className={btn}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </button>
      <button
        type="button"
        onClick={() => zoomTo(1, { duration: 200 })}
        aria-label="Reset zoom"
        className="flex h-7 w-auto items-center justify-center rounded-lg border border-provost-border-subtle bg-white px-2 text-xs font-medium text-provost-text-secondary shadow-sm hover:bg-provost-bg-muted"
      >
        {zoomPercent}%
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        aria-label="Zoom out"
        className={btn}
      >
        <span className="material-symbols-outlined text-[18px]">remove</span>
      </button>
      <button
        type="button"
        onClick={() => fitView({ duration: 300, padding: 0.2, maxZoom: 1 })}
        aria-label="Fit to view"
        className={btn}
      >
        <span className="material-symbols-outlined text-[18px]">fit_screen</span>
      </button>
    </Panel>
  );
}
