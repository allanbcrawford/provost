"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { SignalBadge } from "./signal-badge";
import type { Document, Signal } from "./types";

const HANDLE_STYLE = { opacity: 0, pointerEvents: "none" as const };

const TYPE_ICON: Record<string, string> = {
  "Last Will and Testament": "gavel",
  "Pour-Over Will": "gavel",
  "Letter of Intent / Ethical Will": "menu_book",
  "Revocable Living Trust": "account_balance",
  "Intentionally Defective Grantor Trust": "account_balance",
  "Grantor Retained Annuity Trust": "trending_up",
  "Charitable Trust": "volunteer_activism",
  "Irrevocable Life Insurance Trust": "security",
  "Family Limited Partnership": "groups",
  "Family Governance": "hub",
  "Family Constitution / Family Charter": "description",
};

function iconFor(d: Document): string {
  return TYPE_ICON[d.type] ?? "description";
}

function shortTitle(name: string): string {
  return name.length > 44 ? `${name.slice(0, 42)}…` : name;
}

export function DocumentNode({ data, selected }: NodeProps) {
  const { document: d, signals = [] } = data as { document: Document; signals?: Signal[] };
  const isDanger = d.observation?.type === "danger";
  const pulse = isDanger && !d.observation?.is_observed;
  const categoryLabel = d.category === "estate_plan" ? "Estate plan" : "Financial";

  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={HANDLE_STYLE} />
      <div
        className={[
          "relative flex w-[220px] items-start gap-2 rounded-[10px] bg-white p-2.5",
          "shadow-[0px_3px_3px_0px_rgba(210,211,212,0.25)]",
          selected ? "border-2 border-provost-accent-blue" : "border border-provost-border-subtle",
          pulse ? "gap-pulse" : "",
        ].join(" ")}
      >
        <SignalBadge signals={signals} />
        {isDanger && (
          <span
            title="needs review"
            className="absolute top-1.5 right-1.5 block size-2 rounded-full bg-provost-gap-missing"
          />
        )}
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-provost-bg-subtle">
          <span className="material-symbols-outlined text-[18px] text-provost-text-secondary">
            {iconFor(d)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium text-[12.5px] text-provost-text-primary leading-tight tracking-[-0.2px]">
            {shortTitle(d.name)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="inline-flex rounded-[4px] bg-provost-bg-muted px-1.5 py-0.5 font-medium text-[10px] text-provost-text-secondary uppercase tracking-wide">
              {categoryLabel}
            </span>
            <span className="truncate text-[10.5px] text-provost-text-tertiary">{d.type}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" style={HANDLE_STYLE} />
    </>
  );
}
