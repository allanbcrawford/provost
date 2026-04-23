"use client";

import type { RevisionKey, RevisionState } from "./types";

type Row = { key: RevisionKey; title: string; description: string; tag: string };

const ROWS: Row[] = [
  {
    key: "fundRevocable",
    title: "Fund the Revocable Living Trust",
    description: "Retitle portfolio + residence into the trust",
    tag: "No probate",
  },
  {
    key: "ilit",
    title: "Add an ILIT with $15M policy",
    description: "Proceeds flow to children outside the estate",
    tag: "+$15M liquidity",
  },
  {
    key: "buysell",
    title: "Buy-sell agreement for Williams Holdings",
    description: "Business converts to $12M cash at first death",
    tag: "+$12M liquidity",
  },
  {
    key: "portability",
    title: "Portability election protocol",
    description: "Preserves Robert's exemption for Linda",
    tag: "Trust B minimal",
  },
  {
    key: "qtip",
    title: "QTIP election + Irrevocable Trust beneficiaries",
    description: "Locks terminal beneficiaries of Trust C",
    tag: "Trust C locked",
  },
];

type Props = {
  state: RevisionState;
  onToggle: (key: RevisionKey) => void;
};

export function RevisionsList({ state, onToggle }: Props) {
  return (
    <div className="space-y-2.5">
      {ROWS.map((r) => {
        const active = state[r.key];
        return (
          <label
            key={r.key}
            className={[
              "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 transition-colors",
              active
                ? "border-provost-accent-blue/40 bg-[#e6f2ec]"
                : "border-provost-border-subtle bg-white hover:bg-provost-bg-muted",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => onToggle(r.key)}
              className="sr-only"
              aria-label={r.title}
            />
            <span
              aria-hidden
              className={[
                "flex size-5 shrink-0 items-center justify-center rounded-[5px] border",
                active
                  ? "border-[#1d4a35] bg-[#1d4a35] text-white"
                  : "border-provost-border-strong bg-white text-transparent",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontWeight: 700 }}>
                check
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[13px] text-provost-text-primary">{r.title}</p>
              <p className="text-[12px] text-provost-text-secondary">{r.description}</p>
            </div>
            <span className="whitespace-nowrap font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
              {r.tag}
            </span>
          </label>
        );
      })}
    </div>
  );
}
