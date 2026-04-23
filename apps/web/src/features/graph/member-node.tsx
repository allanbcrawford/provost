"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { formatName } from "./format";
import { SignalBadge } from "./signal-badge";
import type { Member, Signal } from "./types";

const HANDLE_STYLE = { opacity: 0, pointerEvents: "none" as const };

export function MemberNode({ data, selected }: NodeProps) {
  const { member: m, signals = [] } = data as { member: Member; signals?: Signal[] };
  const isAdmin = m.role === "admin";
  const role = isAdmin ? "Principal · Gen 1" : `Gen ${m.generation}`;

  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} id="l" style={HANDLE_STYLE} />
      <div
        className={[
          "relative flex w-[260px] items-center gap-3 rounded-[12px] bg-white p-2.5",
          "shadow-[0px_4px_4px_0px_rgba(210,211,212,0.3)]",
          selected
            ? "border-2 border-provost-accent-blue"
            : isAdmin
              ? "border border-[#616161]"
              : "border-[3px] border-white",
        ].join(" ")}
      >
        <SignalBadge signals={signals} />
        <div className="flex size-[50px] shrink-0 items-center justify-center rounded-[10px] bg-provost-bg-muted">
          <span className="material-symbols-outlined text-[36px] text-provost-neutral-300">
            account_circle
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[16px] text-provost-text-primary leading-snug tracking-[-0.32px]">
            {formatName(m)}
          </p>
          <p className="truncate text-[13px] text-provost-text-secondary leading-snug tracking-[-0.28px]">
            {role}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="r" style={HANDLE_STYLE} />
    </>
  );
}
