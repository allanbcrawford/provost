"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { Signal, SignalSeverity } from "./types";

const HANDLE_STYLE = { opacity: 0, pointerEvents: "none" as const };

const SEVERITY: Record<
  SignalSeverity,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  missing: {
    label: "Missing",
    bg: "bg-provost-gap-missing-bg",
    border: "border-provost-gap-missing",
    text: "text-provost-gap-missing",
    icon: "error",
  },
  review: {
    label: "Review",
    bg: "bg-provost-gap-review-bg",
    border: "border-provost-gap-review",
    text: "text-provost-gap-review",
    icon: "warning",
  },
  stale: {
    label: "Stale",
    bg: "bg-provost-gap-stale-bg",
    border: "border-provost-gap-stale",
    text: "text-provost-gap-stale",
    icon: "history",
  },
};

const CATEGORY_LABEL: Record<Signal["category"], string> = {
  missing: "Missing",
  conflict: "Conflict",
  risk: "Risk",
  recommendation: "Recommendation",
};

export function SignalNode({ data, selected }: NodeProps) {
  const s = (data as { signal: Signal }).signal;
  const sev = SEVERITY[s.severity];
  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={HANDLE_STYLE} />
      <div
        className={[
          "flex w-[220px] items-start gap-2 rounded-[10px] border-2 border-dashed p-2.5",
          sev.bg,
          sev.border,
          selected ? "ring-2 ring-provost-accent-blue ring-offset-1" : "",
        ].join(" ")}
      >
        <span className={`material-symbols-outlined mt-0.5 text-[18px] ${sev.text}`}>
          {sev.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-[9.5px] uppercase tracking-wide ${sev.text}`}>
              {sev.label}
            </span>
            <span className="font-medium text-[9.5px] text-provost-text-tertiary uppercase tracking-wide">
              · {CATEGORY_LABEL[s.category]}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-3 font-medium text-[12px] text-provost-text-primary leading-tight">
            {s.title}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} />
    </>
  );
}
