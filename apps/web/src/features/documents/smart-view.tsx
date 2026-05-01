"use client";

import { Button, Markdown } from "@provost/ui";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import EmptyEstate from "@/components/illustrations/empty-estate";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Props = {
  documentId: Id<"documents">;
  documentTitle: string;
};

type SmartSection = {
  id: string;
  heading: string;
  preview: string;
  body: string;
  observations: Array<{ id: string; severity: string; title: string }>;
  crossRefs: Array<{
    documentId: Id<"documents">;
    documentTitle: string;
    sectionId?: string;
    label: string;
  }>;
};

// Smart View renders an AI-extracted, sectioned summary of an estate
// document. Sections come from `api.documents.documentSections` (see
// `convex/documents.ts`) which derives them from `documents.summary` +
// observations on the doc + cross-doc references.
//
// Sections are addressable by stable DOM ids — Issue 5.2's cross-tab
// search will scroll/highlight by these ids.
export function SmartView({ documentId, documentTitle }: Props) {
  const sections = useQuery(api.documents.documentSections, { documentId }) as
    | SmartSection[]
    | undefined;
  const isAnalyzing = useQuery(api.runs.activeForDocument, { documentId }) ?? false;
  const { requestSeedPrompt } = useChatPanel();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Hash-deep-linking. When the URL has #section-id, expand and scroll to
  // that section after sections load. Used by cross-ref chips that point
  // into a different document's section.
  const [forcedOpen, setForcedOpen] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    if (h) setForcedOpen(h);
  }, []);
  useEffect(() => {
    if (!forcedOpen || !sections) return;
    const el = document.getElementById(forcedOpen);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [forcedOpen, sections, reduceMotion]);

  const onAskProvost = () => {
    requestSeedPrompt(`Summarize "${documentTitle}" and surface anything I should review.`);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
            Smart View
          </p>
          <p className="mt-1 text-[12px] text-provost-text-secondary">
            AI-extracted summary, organized by section.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onAskProvost}>
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          Ask Provost
        </Button>
      </header>

      {isAnalyzing && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] text-blue-900"
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full bg-blue-500 ${
              reduceMotion ? "" : "animate-pulse"
            }`}
          />
          Provost is analyzing this document — results will appear here when ready.
        </div>
      )}

      {sections === undefined ? (
        <div className="p-6 text-provost-text-secondary text-sm">Loading Smart View…</div>
      ) : sections.length === 0 ? (
        <SmartViewEmptyState onAsk={onAskProvost} />
      ) : (
        <ol className="flex flex-col gap-2" aria-label={`${documentTitle} sections`}>
          {sections.map((s) => (
            <SmartSectionRow
              key={s.id}
              section={s}
              forcedOpenId={forcedOpen}
              reduceMotion={reduceMotion}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function SmartViewEmptyState({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-provost-border-default border-dashed bg-white px-6 py-12 text-center">
      <EmptyEstate className="h-32 w-auto" />
      <div className="max-w-sm">
        <p className="font-medium text-[15px] text-provost-text-primary">No Smart View yet</p>
        <p className="mt-1 text-[13px] text-provost-text-secondary">
          Provost hasn't summarized this document. Ask Provost to analyze it and the sections will
          appear here.
        </p>
      </div>
      <Button size="sm" variant="primary" onClick={onAsk}>
        Ask Provost to analyze this document
      </Button>
    </div>
  );
}

function severityChipClass(severity: string): string {
  switch (severity) {
    case "critical":
    case "danger":
      return "bg-red-100 text-red-700";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "info":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function SmartSectionRow({
  section,
  forcedOpenId,
  reduceMotion,
}: {
  section: SmartSection;
  forcedOpenId: string | null;
  reduceMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const isForced = forcedOpenId === section.id;

  useEffect(() => {
    if (isForced) setOpen(true);
  }, [isForced]);

  const obsCount = section.observations.length;
  const refsCount = section.crossRefs.length;

  return (
    <li
      id={section.id}
      data-smart-section-id={section.id}
      data-smart-section-heading={section.heading}
      className="overflow-hidden rounded-md border border-provost-border-default bg-white"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined mt-0.5 text-[20px] text-provost-text-secondary ${
            reduceMotion ? "" : "transition-transform duration-200"
          } ${open ? "rotate-90" : ""}`}
        >
          chevron_right
        </span>
        <span className="min-w-0 flex-1">
          <span
            data-smart-search-target="heading"
            className="block font-medium text-[15px] text-provost-text-primary tracking-[-0.4px]"
          >
            {section.heading}
          </span>
          <span
            data-smart-search-target="preview"
            className="mt-0.5 block text-[13px] text-provost-text-secondary leading-relaxed"
          >
            {section.preview}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {obsCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide ${severityChipClass(
                section.observations[0]?.severity ?? "info",
              )}`}
              title={`${obsCount} observation${obsCount === 1 ? "" : "s"}`}
            >
              {obsCount} obs
            </span>
          )}
          {refsCount > 0 && (
            <span
              className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-[10px] text-neutral-700 uppercase tracking-wide"
              title={`${refsCount} cross-reference${refsCount === 1 ? "" : "s"}`}
            >
              {refsCount} ref
            </span>
          )}
        </span>
      </button>

      <div
        id={contentId}
        hidden={!open}
        className={`grid border-provost-border-default border-t ${
          reduceMotion ? "" : "transition-[grid-template-rows] duration-200"
        }`}
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 px-4 py-4">
            <div data-smart-search-target="body">
              <Markdown className="prose-sm">{section.body}</Markdown>
            </div>

            {section.observations.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
                  Observations in this section
                </p>
                {section.observations.map((obs) => (
                  <article
                    key={obs.id}
                    className="flex items-start gap-2 rounded-md border border-provost-border-default bg-neutral-50 p-3"
                  >
                    <span
                      className={`mt-0.5 rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide ${severityChipClass(
                        obs.severity,
                      )}`}
                    >
                      {obs.severity}
                    </span>
                    <p className="text-[13px] text-provost-text-primary">{obs.title}</p>
                  </article>
                ))}
              </div>
            )}

            {section.crossRefs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
                  Related
                </span>
                {section.crossRefs.map((ref, i) => {
                  const href = ref.sectionId
                    ? `/documents/${ref.documentId}#${ref.sectionId}`
                    : `/documents/${ref.documentId}`;
                  return (
                    <Link
                      key={`${ref.documentId}-${i}`}
                      href={href}
                      className="inline-flex items-center gap-1 rounded-full border border-provost-border-default bg-white px-2.5 py-1 text-[11px] text-provost-text-primary tracking-[-0.2px] transition-colors hover:bg-neutral-50"
                    >
                      <span className="material-symbols-outlined text-[14px] text-provost-text-tertiary">
                        link
                      </span>
                      <span className="max-w-[220px] truncate">{ref.documentTitle}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
