"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { initials } from "./format";
import type { Professional } from "./types";

const HANDLE_STYLE = { opacity: 0, pointerEvents: "none" as const };

export function ProfessionalNode({ data, selected }: NodeProps) {
  const p = (data as { professional: Professional }).professional;
  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={HANDLE_STYLE} />
      <div
        className={[
          "flex w-[220px] items-center gap-2.5 rounded-full bg-white px-3 py-2",
          "shadow-[0px_3px_3px_0px_rgba(210,211,212,0.25)]",
          selected ? "border-2 border-provost-accent-blue" : "border border-provost-border-strong",
        ].join(" ")}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#28303b] font-semibold text-[11px] text-white">
          {initials(p.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[13px] text-provost-text-primary leading-tight">
            {p.name}
          </p>
          <p className="truncate text-[11px] text-provost-text-secondary leading-tight">
            {p.profession}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} />
    </>
  );
}
