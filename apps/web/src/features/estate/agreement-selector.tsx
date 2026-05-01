"use client";

// Issue 5.3 — multi-agreement selector dropdown for the Wealth Flow modal
// header (PRD §16.8).
//
// Renders a button trigger labeled "X Agreements" where X = number of
// currently selected agreements. Clicking expands a popover containing a
// vertical list of agreements with checkboxes. Each row toggles its inclusion
// in the waterfall. "Select all" / "Clear" links sit at the top. The popover
// closes on outside click and on Escape.
//
// This component is intentionally generic (it operates on a list of
// `Agreement` rows passed in as a prop) so it can be reused from the Estate
// list page and — once Issue 5.1 lands — from the document detail page.

import { Icon } from "@provost/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type Agreement = {
  id: Id<"documents">;
  title: string;
  documentType: string;
  executedDate?: number;
};

type Props = {
  agreements: Agreement[];
  selectedIds: Id<"documents">[];
  onChange: (ids: Id<"documents">[]) => void;
  disabled?: boolean;
};

function formatDate(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function prettyType(t: string): string {
  return t
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AgreementSelector({ agreements, selectedIds, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const toggle = (id: Id<"documents">) => {
    if (selectedSet.has(String(id))) {
      onChange(selectedIds.filter((x) => String(x) !== String(id)));
    } else {
      // Preserve original agreements ordering when adding
      const next = agreements
        .map((a) => a.id)
        .filter((x) => selectedSet.has(String(x)) || String(x) === String(id));
      onChange(next);
    }
  };

  const selectAll = () => onChange(agreements.map((a) => a.id));
  const clearAll = () => onChange([]);

  const count = selectedIds.length;
  const label = `${count} Agreement${count === 1 ? "" : "s"}`;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="inline-flex items-center gap-1.5 rounded-full border border-provost-border-subtle bg-white px-3 py-1.5 font-medium text-[12px] text-provost-text-primary shadow-sm transition-colors hover:bg-provost-bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="account_balance" size={14} weight={500} />
        <span>{label}</span>
        <Icon name={open ? "expand_less" : "expand_more"} size={16} weight={500} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-50 mt-2 w-[320px] overflow-hidden rounded-[12px] border border-provost-border-subtle bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-provost-border-subtle border-b bg-provost-bg-muted/30 px-3 py-2">
            <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
              Agreements in scope
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-provost-accent-blue hover:underline"
              >
                Select all
              </button>
              <span className="text-provost-text-tertiary">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-provost-accent-blue hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="max-h-[320px] overflow-y-auto py-1">
            {agreements.length === 0 && (
              <li className="px-3 py-3 text-[12px] text-provost-text-secondary">
                No agreements available.
              </li>
            )}
            {agreements.map((a) => {
              const checked = selectedSet.has(String(a.id));
              return (
                <li key={String(a.id)}>
                  <label
                    className={`flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-provost-bg-muted/40 ${
                      checked ? "bg-provost-bg-secondary/40" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(a.id)}
                      className="mt-1 size-4 cursor-pointer accent-provost-text-primary"
                      aria-label={a.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[13px] text-provost-text-primary">
                        {a.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-provost-text-tertiary">
                        {prettyType(a.documentType)}
                        {a.executedDate ? ` · ${formatDate(a.executedDate)}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
