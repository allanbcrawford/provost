"use client";

import type { Signal, SignalSeverity } from "./types";

const SEV_RANK: Record<SignalSeverity, number> = { missing: 3, review: 2, stale: 1 };

const SEV_COLOR: Record<SignalSeverity, string> = {
  missing: "bg-provost-gap-missing",
  review: "bg-provost-gap-review",
  stale: "bg-provost-gap-stale",
};

export function topSeverity(signals: Signal[]): SignalSeverity | null {
  const first = signals[0];
  if (!first) return null;
  return signals.reduce<SignalSeverity>(
    (best, s) => (SEV_RANK[s.severity] > SEV_RANK[best] ? s.severity : best),
    first.severity,
  );
}

export function SignalBadge({ signals }: { signals: Signal[] }) {
  const sev = topSeverity(signals);
  if (!sev) return null;
  return (
    <span
      className={[
        "absolute -top-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full font-semibold text-[10.5px] text-white shadow-sm",
        SEV_COLOR[sev],
      ].join(" ")}
      title={`${signals.length} open signal${signals.length === 1 ? "" : "s"}`}
    >
      {signals.length > 9 ? "9+" : signals.length}
    </span>
  );
}
