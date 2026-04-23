"use client";

import { useEffect, useState } from "react";
import { shortName } from "@/features/graph/format";
import type { GraphPayload, Signal } from "@/features/graph/types";

type Props = {
  signal: Signal | null;
  payload: GraphPayload;
  onClose: () => void;
  onSend: (signalId: string) => void;
};

function buildPrompt(signal: Signal, payload: GraphPayload): string {
  const members = payload.members.filter((m) => signal.memberIds.includes(m.id));
  const relatedDoc = signal.relatedDocumentId
    ? payload.documents.find((d) => d.id === signal.relatedDocumentId)
    : undefined;
  const pro = payload.professionals.find((p) => p.id === signal.suggestedProfessionalId);

  const memberLine = members.length ? members.map((m) => shortName(m)).join(", ") : "the family";
  const docLine = relatedDoc ? `\nAffected document: ${relatedDoc.name}` : "";
  const proLine = pro ? `\nSuggested owner: ${pro.name} (${pro.profession})` : "";

  return [
    `Draft revision — ${signal.title}`,
    "",
    `Context: ${signal.reason}`,
    `Affects: ${memberLine}${docLine}${proLine}`,
    "",
    signal.suggestedAction ??
      "Produce redline language suitable for a first review by the drafting professional.",
  ].join("\n");
}

export function DraftRevisionModal({ signal, payload, onClose, onSend }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (signal) setText(buildPrompt(signal, payload));
  }, [signal, payload]);

  useEffect(() => {
    if (!signal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signal, onClose]);

  if (!signal) return null;

  const pro = payload.professionals.find((p) => p.id === signal.suggestedProfessionalId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-label="Draft revision"
        className="relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-provost-border-subtle border-b px-5 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
              Draft revision
            </p>
            <h3 className="mt-0.5 font-dm-serif text-[18px] text-provost-text-primary leading-tight">
              {signal.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-provost-text-secondary hover:bg-provost-bg-muted"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 px-5 py-4">
          <label
            htmlFor="draft-revision-text"
            className="mb-1.5 block font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider"
          >
            Message to planner
          </label>
          <textarea
            id="draft-revision-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full resize-y rounded-[10px] border border-provost-border-subtle bg-white px-3 py-2.5 text-[13px] text-provost-text-primary leading-relaxed focus:border-provost-accent-blue focus:outline-none focus:ring-1 focus:ring-provost-accent-blue"
          />
          <p className="mt-2 text-[11.5px] text-provost-text-tertiary">
            This pre-seeds a Provost chat with the affected documents and signal context. The
            planner reviews and refines into a formal amendment.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-provost-border-subtle border-t bg-provost-bg-muted px-5 py-3">
          <div className="text-[11.5px] text-provost-text-secondary">
            {pro ? (
              <>
                Will route to{" "}
                <span className="font-medium text-provost-text-primary">{pro.name}</span> ·{" "}
                {pro.profession}
              </>
            ) : (
              "No default professional assigned"
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1.5 font-medium text-[12.5px] text-provost-text-secondary hover:bg-provost-bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSend(signal.id)}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-provost-text-primary px-3 py-1.5 font-medium text-[12.5px] text-white hover:bg-black"
            >
              <span className="material-symbols-outlined text-[14px]">send</span>
              Send to planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
