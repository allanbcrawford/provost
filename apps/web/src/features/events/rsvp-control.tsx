"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export function RsvpControl({
  eventId,
  current,
}: {
  eventId: Id<"events">;
  current: RsvpStatus | null;
}) {
  const rsvp = useMutation(api.events.rsvp);
  const [pending, setPending] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimistic display value: while a mutation is in-flight, show the chosen
  // option even before the server round-trip completes.
  const display = pending ?? current ?? "pending";

  async function choose(next: RsvpStatus) {
    if (next === display) return;
    setPending(next);
    setError(null);
    try {
      await rsvp({ eventId, status: next });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update RSVP.";
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="Your RSVP"
        className="inline-flex rounded-full border border-provost-border-subtle bg-white p-0.5"
      >
        {OPTIONS.map((opt) => {
          const selected = display === opt.value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: parent has role="radiogroup"; styled buttons preserve the pill UX
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(opt.value)}
              className={`rounded-full px-3 py-1 font-medium text-[13px] tracking-[-0.39px] transition-colors ${
                selected
                  ? "bg-provost-bg-inverse text-provost-text-inverse"
                  : "text-provost-text-secondary hover:bg-provost-bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
