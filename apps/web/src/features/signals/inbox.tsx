"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type Signal = Doc<"signals">;
type Observation = Doc<"observations">;

const SEVERITY_ORDER: Signal["severity"][] = ["review", "missing", "stale"];

const SEVERITY_LABEL: Record<Signal["severity"], string> = {
  review: "Review required",
  missing: "Missing",
  stale: "Stale",
};

const SEVERITY_STYLES: Record<Signal["severity"], string> = {
  review: "bg-red-50 text-red-700 border-red-200",
  missing: "bg-amber-50 text-amber-800 border-amber-200",
  stale: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function SignalsInbox() {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;

  const signals = useQuery(api.signals.listOpen, familyId ? { familyId } : "skip");
  const observations = useQuery(api.signals.listObservations, familyId ? { familyId } : "skip");
  const generateFromRules = useMutation(api.signals.generateFromRules);
  const updateStatus = useMutation(api.signals.updateStatus);

  useEffect(() => {
    if (!familyId) return;
    generateFromRules({ familyId }).catch(() => undefined);
  }, [familyId, generateFromRules]);

  const grouped = useMemo(() => {
    const g: Record<Signal["severity"], Signal[]> = { review: [], missing: [], stale: [] };
    for (const s of signals ?? []) g[s.severity].push(s);
    return g;
  }, [signals]);

  if (!family) {
    return <div className="p-8 text-neutral-500 text-sm">Select a family to view the inbox.</div>;
  }

  if (signals === undefined || observations === undefined) {
    return <div className="p-8 text-neutral-500 text-sm">Loading inbox…</div>;
  }

  const totalSignals = signals.length;
  const totalObservations = observations.length;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="font-semibold text-2xl text-neutral-900">Signals Inbox</h1>
        <p className="mt-1 text-neutral-600 text-sm">
          {totalSignals} open signal{totalSignals === 1 ? "" : "s"} · {totalObservations}{" "}
          observation{totalObservations === 1 ? "" : "s"}
        </p>
      </header>

      {totalSignals === 0 && totalObservations === 0 ? (
        <div className="rounded-md border border-neutral-200 bg-white p-6 text-neutral-600 text-sm">
          Nothing to review right now.
        </div>
      ) : null}

      {SEVERITY_ORDER.map((sev) => {
        const list = grouped[sev];
        if (list.length === 0) return null;
        return (
          <section key={sev} className="space-y-3">
            <h2 className="font-medium text-neutral-700 text-sm uppercase tracking-wide">
              {SEVERITY_LABEL[sev]} ({list.length})
            </h2>
            <ul className="space-y-3">
              {list.map((s) => (
                <SignalCard
                  key={s._id}
                  signal={s}
                  onDraft={() => updateStatus({ signalId: s._id, status: "drafting" })}
                  onResolve={() => updateStatus({ signalId: s._id, status: "resolved" })}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {observations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-medium text-neutral-700 text-sm uppercase tracking-wide">
            Observations ({observations.length})
          </h2>
          <ul className="space-y-3">
            {observations.map((o) => (
              <ObservationCard key={o._id} observation={o} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SignalCard({
  signal,
  onDraft,
  onResolve,
}: {
  signal: Signal;
  onDraft: () => void;
  onResolve: () => void;
}) {
  return (
    <li className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs ${SEVERITY_STYLES[signal.severity]}`}
            >
              {SEVERITY_LABEL[signal.severity]}
            </span>
            <span className="text-neutral-400 text-xs uppercase tracking-wide">
              {signal.category}
            </span>
            {signal.status === "drafting" ? (
              <span className="text-blue-600 text-xs">Drafting</span>
            ) : null}
          </div>
          <h3 className="mt-2 font-medium text-neutral-900 text-sm">{signal.title}</h3>
          <p className="mt-1 text-neutral-700 text-sm">{signal.reason}</p>
          {signal.suggested_action ? (
            <p className="mt-2 text-neutral-600 text-sm">
              <span className="font-medium text-neutral-700">Suggested:</span>{" "}
              {signal.suggested_action}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onDraft}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 text-sm hover:bg-neutral-50"
        >
          Draft revision →
        </button>
        <button
          type="button"
          onClick={onResolve}
          className="rounded-md px-3 py-1.5 font-medium text-neutral-600 text-sm hover:bg-neutral-100"
        >
          Mark resolved
        </button>
      </div>
    </li>
  );
}

function ObservationCard({ observation }: { observation: Observation }) {
  return (
    <li className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-700 text-xs">
          Observation
        </span>
        <span className="text-neutral-400 text-xs uppercase tracking-wide">
          {observation.status}
        </span>
      </div>
      <h3 className="mt-2 font-medium text-neutral-900 text-sm">{observation.title}</h3>
      <p className="mt-1 text-neutral-700 text-sm">{observation.description}</p>
      <p className="mt-2 text-neutral-600 text-sm">
        <span className="font-medium text-neutral-700">Why this matters:</span>{" "}
        {observation.why_this_matters}
      </p>
      <p className="mt-1 text-neutral-600 text-sm">
        <span className="font-medium text-neutral-700">Recommendation:</span>{" "}
        {observation.recommendation}
      </p>
      {observation.next_best_actions.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600 text-sm">
          {observation.next_best_actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
