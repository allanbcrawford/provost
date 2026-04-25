"use client";

// Unallocated assets lane (P3.4 / Q31.2 = A). Reads the family's assets
// total + the live engine output, so "allocated" / "unallocated" reflect
// real distribution math instead of the previous 90% placeholder.

import { useQuery } from "convex/react";
import { useAuthedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { CustomEdits, RevisionState, SelectedAgreement } from "./types";

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
  customEdits,
  revisions,
}: {
  selectedAgreements: SelectedAgreement[];
  customEdits?: CustomEdits;
  revisions?: RevisionState;
}) {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const summary = useQuery(api.assets.summary, familyId ? { familyId } : "skip") as
    | { total: number; currency: string; count: number; byType: { type: string; value: number }[] }
    | undefined;

  const selectedIds = selectedAgreements.map((s) => s.documentId as Id<"documents">);
  const deathOrder = customEdits?.deathOrder ?? "robert-first";
  const engineRevisions = revisions
    ? { addResiduaryToSpouse: !!revisions.addResiduaryToSpouse }
    : {};

  const engine = useQuery(
    api.waterfalls.compute,
    familyId && selectedIds.length > 0
      ? {
          familyId,
          selectedDocumentIds: selectedIds,
          deathOrder,
          customEdits: { ...(customEdits ?? {}) },
          revisions: engineRevisions,
        }
      : "skip",
  );

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

  // When no agreements are selected the engine isn't called; nothing is
  // allocated by definition. Otherwise wait for the engine result before
  // reporting numbers so we don't flash a stale placeholder.
  const engineReady = selectedIds.length === 0 ? true : engine !== undefined;
  const unallocated = selectedIds.length === 0 ? summary.total : (engine?.unallocated ?? 0);
  const allocated = summary.total - unallocated;
  const unallocatedAssetCount =
    selectedIds.length === 0 ? summary.count : (engine?.unallocatedAssetIds.length ?? 0);

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
            {engineReady ? formatCurrency(allocated, summary.currency) : "…"}
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
            {engineReady ? formatCurrency(unallocated, summary.currency) : "…"}
          </p>
        </div>
      </div>
      {engineReady && unallocated > 0 && selectedAgreements.length > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 tracking-[-0.36px]">
          {unallocatedAssetCount} asset{unallocatedAssetCount === 1 ? "" : "s"} not covered by the
          selected agreements. Toggle "Residuary clause to surviving spouse" to absorb the remainder
          into the surviving spouse's share.
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
