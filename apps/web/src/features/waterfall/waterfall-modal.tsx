"use client";

import { useEffect, useState } from "react";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { AgreementsSelector } from "./agreements-selector";
import { DeltaSummary } from "./delta-summary";
import { NodeEditorDrawer } from "./node-editor-drawer";
import { RevisionsList } from "./revisions-list";
import {
  type CustomEdits,
  DEFAULT_REVISIONS,
  type DeathOrder,
  type EditableNodeId,
  type RevisionKey,
  type RevisionState,
  type SelectedAgreement,
} from "./types";
import { UnallocatedSummary } from "./unallocated-summary";
import { WaterfallDiagram } from "./waterfall-diagram";

type Props = {
  open: boolean;
  onClose: () => void;
  initialRevisions?: RevisionState;
  initialCustomEdits?: CustomEdits;
};

function formatDeathOrder(order: DeathOrder | undefined): string {
  if (!order) return "Robert → Linda (default)";
  if (order === "robert-first") return "Robert → Linda";
  if (order === "linda-first") return "Linda → Robert";
  return "Simultaneous";
}

export function WaterfallModal({ open, onClose, initialRevisions, initialCustomEdits }: Props) {
  const [revisions, setRevisions] = useState<RevisionState>(initialRevisions ?? DEFAULT_REVISIONS);
  const [customEdits, setCustomEdits] = useState<CustomEdits>(initialCustomEdits ?? {});
  const [editing, setEditing] = useState<EditableNodeId | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing, onClose]);

  if (!open) return null;

  const toggleRevision = (key: RevisionKey) => {
    setRevisions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetCustomKey = (k: keyof CustomEdits) => {
    setCustomEdits((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const resetForNode = (node: EditableNodeId) => {
    setCustomEdits((prev) => {
      const next = { ...prev };
      if (node === "david" || node === "jennifer" || node === "michael") delete next.childrenPct;
      if (node === "trustB") delete next.trustBFunding;
      if (node === "firstDeath") delete next.deathOrder;
      return next;
    });
  };

  const activeRevisionCount = (Object.values(revisions) as boolean[]).filter(Boolean).length;
  const customCount =
    (customEdits.childrenPct ? 1 : 0) +
    (customEdits.trustBFunding !== undefined ? 1 : 0) +
    (customEdits.deathOrder ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Waterfall Inheritance Simulation"
    >
      <div className="relative flex h-full max-h-[96vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[16px] border border-provost-border-subtle bg-provost-bg-primary shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-provost-border-subtle border-b bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
              Scenario simulation
            </p>
            <h2 className="font-dm-serif text-[24px] text-provost-text-primary leading-tight">
              Waterfall Inheritance Simulation
            </h2>
            <p className="mt-1 text-[12px] text-provost-text-secondary">
              Death order: {formatDeathOrder(customEdits.deathOrder)}
              <span className="mx-1.5 text-provost-text-tertiary">·</span>
              Revisions active: {activeRevisionCount}/5
              <span className="mx-1.5 text-provost-text-tertiary">·</span>
              Custom edits: {customCount}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close simulation"
            className="flex size-9 items-center justify-center rounded-full text-provost-text-secondary hover:bg-provost-bg-muted"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
              <AgreementsSelector
                selected={customEdits.selectedAgreements ?? []}
                onChange={(next) =>
                  setCustomEdits((prev) => ({ ...prev, selectedAgreements: next }))
                }
              />
              <UnallocatedSummary selectedAgreements={customEdits.selectedAgreements ?? []} />
            </section>

            <section className="mb-5">
              <p className="mb-2 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
                Proposed revisions
              </p>
              <RevisionsList state={revisions} onToggle={toggleRevision} />
            </section>

            <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-[14px] border border-provost-border-subtle bg-white p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="font-dm-serif text-[16px] text-provost-text-primary">
                    Current Waterfall
                  </p>
                  <span className="text-[11px] text-provost-text-tertiary uppercase tracking-wider">
                    As documented today
                  </span>
                </div>
                <WaterfallDiagram
                  variant="current"
                  revisions={DEFAULT_REVISIONS}
                  customEdits={{}}
                />
              </div>
              <div className="rounded-[14px] border border-provost-accent-blue/30 bg-white p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="font-dm-serif text-[16px] text-provost-text-primary">
                    With Revisions
                  </p>
                  <span className="text-[#6d28d9] text-[11px] uppercase tracking-wider">
                    After proposed amendments
                  </span>
                </div>
                <WaterfallDiagram
                  variant="revised"
                  revisions={revisions}
                  customEdits={customEdits}
                  onEditNode={(node) => setEditing(node)}
                />
              </div>
            </section>

            <section>
              <DeltaSummary
                revisions={revisions}
                customEdits={customEdits}
                onResetCustom={resetCustomKey}
              />
            </section>

            <AiDisclaimer kind="financial" />
          </div>

          <NodeEditorDrawer
            editing={editing}
            customEdits={customEdits}
            onClose={() => setEditing(null)}
            onApply={(next) => setCustomEdits(next)}
            onResetForNode={resetForNode}
          />
        </div>
      </div>
    </div>
  );
}
