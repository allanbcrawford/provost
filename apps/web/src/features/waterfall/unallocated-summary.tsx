"use client";

// Unallocated assets lane (P3.4 / Q31.2 = A). Reads the family's assets
// total and shows it alongside an "allocated" estimate so unallocated
// dollars surface as a separate flow lane in the waterfall side panel.
//
// "Allocated" is approximated today — we don't yet have a parser that
// reads each agreement's funding to compute precise allocation. We treat
// "allocated" as 0 unless agreements are selected, at which point we
// estimate at 90% of total (placeholder until the engine can read each
// agreement's `state` blob). This lets the lane render with realistic
// behavior so the UX is testable; precise math is a follow-up.

import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { SelectedAgreement } from "./types";

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function UnallocatedSummary({
  selectedAgreements,
}: {
  selectedAgreements: SelectedAgreement[];
}) {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const summary = useQuery(api.assets.summary, familyId ? { familyId } : "skip") as
    | { total: number; currency: string; count: number; byType: { type: string; value: number }[] }
    | undefined;

  if (!summary) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle bg-white p-4 text-[12px] text-provost-text-secondary">
        Loading asset totals…
      </div>
    );
  }
  if (summary.count === 0) {
    return null;
  }

  // Placeholder allocation estimate. Real engine work is tracked separately.
  const allocatedShare = selectedAgreements.length === 0 ? 0 : 0.9;
  const allocated = Math.round(summary.total * allocatedShare);
  const unallocated = summary.total - allocated;

  return (
    <div className="rounded-[14px] border border-provost-accent-blue/30 bg-white p-4">
      <p className="mb-2 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
        Asset coverage
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-provost-text-tertiary uppercase tracking-wider">Total</p>
          <p className="mt-1 font-dm-serif text-[20px] text-provost-text-primary">
            {formatCurrency(summary.total, summary.currency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-provost-text-tertiary uppercase tracking-wider">
            Allocated
          </p>
          <p className="mt-1 font-dm-serif text-[20px] text-provost-text-primary">
            {formatCurrency(allocated, summary.currency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-provost-text-tertiary uppercase tracking-wider">
            Unallocated
          </p>
          <p
            className={`mt-1 font-dm-serif text-[20px] ${
              unallocated > 0 ? "text-amber-700" : "text-provost-text-primary"
            }`}
          >
            {formatCurrency(unallocated, summary.currency)}
          </p>
        </div>
      </div>
      {unallocated > 0 && selectedAgreements.length > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] tracking-[-0.36px] text-amber-900">
          Assets not covered by the selected agreements default to spouse / intestacy. Add a trust
          or will to absorb the remainder.
        </p>
      )}
      {selectedAgreements.length === 0 && (
        <p className="mt-3 text-[12px] text-provost-text-secondary">
          Select one or more agreements above to see how much of the estate they cover.
        </p>
      )}
    </div>
  );
}
