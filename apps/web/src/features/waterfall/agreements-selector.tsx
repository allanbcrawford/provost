"use client";

// Multi-agreement selector for the waterfall modal (P3.4). Reads the
// family's documents, filters to estate-planning categories that map to a
// supported AgreementCategory, and lets the user check which agreements
// participate in the simulation.
//
// Today the diagram still uses the bespoke Williams waterfall regardless of
// the selection — picking agreements doesn't change node math yet. The
// selector is the structural hook so a future engine can wire in.

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AGREEMENT_PRIORITY, type AgreementCategory, type SelectedAgreement } from "./types";

// Map raw document.type / category strings to AgreementCategory. The dev
// seed uses a handful of values; unknown types are skipped. The UI hides
// the toggle for documents we don't know how to incorporate.
function classifyDocument(args: {
  type: string;
  category: string;
  name: string;
}): AgreementCategory | null {
  const blob = `${args.type} ${args.category} ${args.name}`.toLowerCase();
  if (blob.includes("revocable")) return "revocable_trust";
  if (blob.includes("trust")) return "irrevocable_trust";
  if (blob.includes("will")) return "will";
  return null;
}

const CATEGORY_LABEL: Record<AgreementCategory, string> = {
  revocable_trust: "Revocable trust",
  irrevocable_trust: "Trust",
  will: "Will",
};

export function AgreementsSelector({
  selected,
  onChange,
}: {
  selected: SelectedAgreement[];
  onChange: (next: SelectedAgreement[]) => void;
}) {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const docs = useQuery(api.documents.list, familyId ? { familyId } : "skip") as
    | Array<{ _id: Id<"documents">; name: string; category: string; type: string }>
    | undefined;

  const candidates = useMemo(() => {
    if (!docs) return [];
    return docs
      .map((d) => {
        const category = classifyDocument({ type: d.type, category: d.category, name: d.name });
        if (!category) return null;
        return {
          documentId: d._id as string,
          name: d.name,
          category,
        } satisfies SelectedAgreement;
      })
      .filter((c): c is SelectedAgreement => c !== null)
      .sort((a, b) => AGREEMENT_PRIORITY[a.category] - AGREEMENT_PRIORITY[b.category]);
  }, [docs]);

  if (!docs) {
    return <p className="text-[12px] text-provost-text-secondary">Loading documents…</p>;
  }
  if (candidates.length === 0) {
    return (
      <p className="text-[12px] text-provost-text-secondary">
        No estate-planning documents available. Add a trust or will to compose a multi-agreement
        scenario.
      </p>
    );
  }

  const isSelected = (id: string) => selected.some((s) => s.documentId === id);

  function toggle(c: SelectedAgreement) {
    if (isSelected(c.documentId)) {
      onChange(selected.filter((s) => s.documentId !== c.documentId));
    } else {
      // Maintain priority ordering: revocable trust → irrevocable → will.
      const next = [...selected, c].sort(
        (a, b) => AGREEMENT_PRIORITY[a.category] - AGREEMENT_PRIORITY[b.category],
      );
      onChange(next);
    }
  }

  return (
    <div className="rounded-[14px] border border-provost-border-subtle bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
          Agreements in scope
        </p>
        <p className="text-[11px] text-provost-text-tertiary">
          {selected.length}/{candidates.length} selected · trust supersedes will
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {candidates.map((c) => {
          const checked = isSelected(c.documentId);
          return (
            <li key={c.documentId}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-2 transition-colors ${
                  checked
                    ? "border-provost-text-primary bg-provost-bg-secondary"
                    : "border-provost-border-subtle bg-white hover:bg-provost-bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c)}
                  className="mt-1 cursor-pointer"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium tracking-[-0.42px] text-provost-text-primary">
                    {c.name}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-provost-bg-muted px-2 py-0.5 text-[11px] tracking-[-0.33px] text-provost-text-secondary">
                    <Icon
                      name={c.category === "will" ? "description" : "account_balance"}
                      size={12}
                      weight={400}
                    />
                    {CATEGORY_LABEL[c.category]}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
