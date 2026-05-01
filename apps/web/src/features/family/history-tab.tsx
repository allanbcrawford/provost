"use client";

import { Icon } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Issue 6.2 — History tab. Vertical timeline of family_history_events, grouped
// by month-year. Empty state shows a backfill CTA for advisor / family_admin.

type HistoryKind =
  | "member_added"
  | "member_removed"
  | "document_executed"
  | "observation_resolved"
  | "event_held"
  | "manual";

const ICON_FOR_KIND: Record<HistoryKind, string> = {
  member_added: "person_add",
  member_removed: "person_remove",
  document_executed: "description",
  observation_resolved: "task_alt",
  event_held: "event",
  manual: "edit_note",
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function relativeTime(occurredAt: number): string {
  const diff = Date.now() - occurredAt;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} wk ago`;
  return DATE_FORMATTER.format(new Date(occurredAt));
}

export function FamilyHistoryTab({ familyId }: { familyId?: Id<"families"> }) {
  const events = useQuery(
    api.familyHistory.listEvents,
    familyId ? { familyId, limit: 100 } : "skip",
  );
  const backfill = useMutation(api.familyHistory.backfillFromExistingData);
  const role = useUserRole();
  const canBackfill = role === "admin" || role === "advisor";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackfill = async () => {
    if (!familyId) return;
    setBusy(true);
    setError(null);
    try {
      await backfill({ familyId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBusy(false);
    }
  };

  if (!familyId || events === undefined) {
    return (
      <div className="p-8 text-[13px] text-provost-text-secondary">Loading history…</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-16">
        <Icon name="history" size={48} weight={200} className="text-provost-text-tertiary" />
        <h2 className="mt-4 font-dm-serif text-[24px] text-provost-text-primary">
          No events yet
        </h2>
        <p className="mt-3 max-w-md text-center font-light text-[14px] text-provost-text-secondary">
          {canBackfill
            ? "Click Backfill to populate the timeline from your family's existing data."
            : "As your family adds members, documents, and events, they'll appear here."}
        </p>
        {canBackfill ? (
          <button
            type="button"
            onClick={handleBackfill}
            disabled={busy}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-provost-border-strong px-4 py-2 font-medium text-[13px] text-provost-text-primary transition-colors hover:bg-provost-bg-secondary disabled:opacity-50"
          >
            <Icon name="auto_awesome" size={16} weight={300} />
            {busy ? "Backfilling…" : "Backfill from existing data"}
          </button>
        ) : null}
        {error ? (
          <p className="mt-3 text-[12px] text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  // Group by month-year using occurred_at.
  const groups: { label: string; rows: typeof events }[] = [];
  for (const e of events) {
    const label = MONTH_FORMATTER.format(new Date(e.occurred_at));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(e);
    else groups.push({ label, rows: [e] });
  }

  return (
    <div className="p-8">
      {canBackfill ? (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={handleBackfill}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-provost-border-subtle px-3 py-1.5 font-light text-[12px] text-provost-text-secondary transition-colors hover:border-provost-border-strong hover:text-provost-text-primary disabled:opacity-50"
          >
            <Icon name="auto_awesome" size={14} weight={300} />
            {busy ? "Backfilling…" : "Backfill last 90 days"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mb-4 text-[12px] text-red-600">{error}</p>
      ) : null}
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="mb-3 font-medium text-[12px] text-provost-text-tertiary uppercase tracking-wider">
              {g.label}
            </h3>
            <ol className="space-y-4 border-provost-border-subtle border-l pl-6">
              {g.rows.map((row) => (
                <li key={row._id} className="relative">
                  <span className="-left-[34px] absolute top-1 flex size-6 items-center justify-center rounded-full bg-white border border-provost-border-subtle">
                    <Icon
                      name={ICON_FOR_KIND[row.kind as HistoryKind] ?? "circle"}
                      size={14}
                      weight={300}
                      className="text-provost-text-secondary"
                    />
                  </span>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium text-[14px] text-provost-text-primary">
                      {row.title}
                    </p>
                    <span className="shrink-0 font-light text-[11px] text-provost-text-tertiary">
                      {relativeTime(row.occurred_at)}
                    </span>
                  </div>
                  {row.description ? (
                    <p className="mt-1 font-light text-[13px] text-provost-text-secondary">
                      {row.description}
                    </p>
                  ) : null}
                  {row.actor_name ? (
                    <p className="mt-1 font-light text-[11px] text-provost-text-tertiary">
                      by {row.actor_name}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
