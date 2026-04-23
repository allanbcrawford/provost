"use client";

import { Markdown } from "@provost/ui";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type DraftRevisionCitation = {
  page: number;
  snippet: string;
};

export type DraftRevisionWidgetProps = {
  signalId: string;
  signalTitle: string;
  documentId?: string | null;
  redlineMarkdown: string;
  targetProfessionalHint: string | null;
  citations: DraftRevisionCitation[];
};

const PROFESSIONAL_LABEL: Record<string, string> = {
  attorney: "Attorney",
  accountant: "Accountant",
  estate_planner: "Estate planner",
  trust_officer: "Trust officer",
};

export function DraftRevisionWidget({
  signalId,
  signalTitle,
  documentId,
  redlineMarkdown,
  targetProfessionalHint,
  citations,
}: DraftRevisionWidgetProps) {
  const family = useSelectedFamily();
  const createTask = useMutation(api.tasks.create);
  const [sending, setSending] = useState(false);
  const [sentTaskId, setSentTaskId] = useState<Id<"tasks"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hintLabel = targetProfessionalHint
    ? (PROFESSIONAL_LABEL[targetProfessionalHint] ?? targetProfessionalHint)
    : null;

  const handleSend = async () => {
    if (!family) {
      setError("No family selected");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const taskId = await createTask({
        familyId: family._id,
        assigneeType: "professional",
        title: `Review drafted revision: ${signalTitle}`,
        body: redlineMarkdown,
        sourceSignalId: signalId as Id<"signals">,
      });
      setSentTaskId(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-provost-text-tertiary">
          Draft revision
        </span>
        {hintLabel ? (
          <span className="rounded-[4px] border border-provost-border-subtle bg-provost-bg-primary px-1.5 py-0.5 text-[11px] font-medium text-provost-text-primary">
            Route to: {hintLabel}
          </span>
        ) : null}
      </div>

      <div className="mb-1 font-semibold text-provost-text-primary">{signalTitle}</div>

      <div className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-3 py-2 text-provost-text-primary">
        <Markdown>{redlineMarkdown}</Markdown>
      </div>

      {citations.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-provost-border-subtle pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-provost-text-tertiary">
            Citations
          </div>
          {citations.map((c) => (
            <div key={c.page} className="flex items-start gap-2">
              {documentId ? (
                <Link
                  href={`/documents/${documentId}?page=${c.page}`}
                  className="shrink-0 rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2 py-0.5 text-[11px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
                >
                  View p.{c.page}
                </Link>
              ) : (
                <span className="shrink-0 rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2 py-0.5 text-[11px] font-medium text-provost-text-primary">
                  p.{c.page}
                </span>
              )}
              <span className="text-[12px] text-provost-text-secondary">{c.snippet}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-provost-border-subtle pt-2">
        <div className="text-[11.5px] text-provost-text-tertiary">
          Sends this redline as a task to a {hintLabel ?? "professional"} for review.
        </div>
        {sentTaskId ? (
          <Link
            href="/governance"
            className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2.5 py-1 text-[11.5px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
          >
            View task →
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !family}
            className="rounded-[6px] border border-provost-border-subtle bg-provost-text-primary px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send to planner →"}
          </button>
        )}
      </div>
      {error ? <div className="mt-2 text-[11.5px] text-red-600">{error}</div> : null}
    </div>
  );
}
