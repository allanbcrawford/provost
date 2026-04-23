"use client";

import { useState } from "react";
import type { SelectedNode, Signal, SignalSeverity } from "@/features/graph/types";

const SEV_ORDER: SignalSeverity[] = ["missing", "review", "stale"];

const SEV_LABEL: Record<SignalSeverity, string> = {
  missing: "Missing",
  review: "Review required",
  stale: "Stale",
};

const SEV_DOT: Record<SignalSeverity, string> = {
  missing: "bg-provost-gap-missing",
  review: "bg-provost-gap-review",
  stale: "bg-provost-gap-stale",
};

type Props = {
  signals: Signal[];
  sentIds: Set<string>;
  onFocus: (sel: SelectedNode) => void;
  selectedId: string | null;
};

export function SignalsRail({ signals, sentIds, onFocus, selectedId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const openSignals = signals.filter((s) => !sentIds.has(s.id));
  const bySev = Object.fromEntries(
    SEV_ORDER.map((s) => [s, openSignals.filter((g) => g.severity === s)]),
  ) as Record<SignalSeverity, Signal[]>;

  return (
    <aside
      className={[
        "relative flex shrink-0 flex-col border-provost-border-subtle border-r bg-white/70 backdrop-blur transition-[width]",
        collapsed ? "w-10" : "w-[320px]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand signals list" : "Collapse signals list"}
        className="absolute top-4 -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-provost-border-subtle bg-white text-provost-text-secondary shadow-sm hover:bg-provost-bg-muted"
      >
        <span className="material-symbols-outlined text-[16px]">
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {!collapsed && (
        <div className="flex h-full flex-col">
          <div className="border-provost-border-subtle border-b px-4 py-3">
            <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
              Signals
            </p>
            <p className="mt-0.5 font-medium text-[15px] text-provost-text-primary">
              {openSignals.length} open · {sentIds.size} sent
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-provost-text-secondary">
              {SEV_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`block size-2 rounded-full ${SEV_DOT[s]}`} />
                  {bySev[s].length} {SEV_LABEL[s].toLowerCase()}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {SEV_ORDER.map((sev) =>
              bySev[sev].length === 0 ? null : (
                <div key={sev} className="mb-3">
                  <p className="px-2 pb-1.5 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
                    {SEV_LABEL[sev]} · {bySev[sev].length}
                  </p>
                  <ul className="space-y-1">
                    {bySev[sev].map((g) => {
                      const selected = g.id === selectedId;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => onFocus({ kind: "signal", id: g.id })}
                            className={[
                              "flex w-full items-start gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors",
                              selected ? "bg-provost-bg-muted" : "hover:bg-provost-bg-muted",
                            ].join(" ")}
                          >
                            <span
                              className={`mt-1.5 block size-1.5 shrink-0 rounded-full ${SEV_DOT[sev]}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-[12.5px] text-provost-text-primary">
                                {g.title}
                              </span>
                              <span className="line-clamp-2 text-[11.5px] text-provost-text-secondary leading-snug">
                                {g.reason}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
            {openSignals.length === 0 && (
              <p className="px-3 py-6 text-center text-[12.5px] text-provost-text-secondary">
                All signals resolved.
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
