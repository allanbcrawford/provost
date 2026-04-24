"use client";

import { useMutation, useQuery } from "convex/react";
import { Fragment, useEffect, useMemo } from "react";
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

const SEVERITY_CHIP: Record<Signal["severity"], string> = {
  review: "bg-red-50 text-red-700 border-red-200",
  missing: "bg-amber-50 text-amber-800 border-amber-200",
  stale: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function SignalsInbox() {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;

  const signals = useQuery(api.signals.listOpen, familyId ? { familyId } : "skip") as
    | Signal[]
    | undefined;
  const observations = useQuery(api.signals.listObservations, familyId ? { familyId } : "skip") as
    | Observation[]
    | undefined;
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
    return (
      <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        Select a family to view the inbox.
      </div>
    );
  }

  if (signals === undefined || observations === undefined) {
    return (
      <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        Loading inbox…
      </div>
    );
  }

  const totalSignals = signals.length;
  const totalObservations = observations.length;

  return (
    <div className="flex flex-col gap-10">
      <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        {totalSignals} open signal{totalSignals === 1 ? "" : "s"} · {totalObservations} observation
        {totalObservations === 1 ? "" : "s"}
      </p>

      {totalSignals === 0 && totalObservations === 0 ? (
        <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Nothing to review right now.
        </div>
      ) : null}

      {SEVERITY_ORDER.map((sev) => {
        const list = grouped[sev];
        if (list.length === 0) return null;
        return (
          <section key={sev}>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
              {SEVERITY_LABEL[sev]} ({list.length})
            </h2>
            <ul className="flex flex-col">
              {list.map((s, idx) => (
                <Fragment key={s._id}>
                  {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
                  <li>
                    <SignalRow
                      signal={s}
                      onDraft={() => updateStatus({ signalId: s._id, status: "drafting" })}
                      onResolve={() => updateStatus({ signalId: s._id, status: "resolved" })}
                    />
                  </li>
                </Fragment>
              ))}
            </ul>
          </section>
        );
      })}

      {observations.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
            Observations ({observations.length})
          </h2>
          <ul className="flex flex-col">
            {observations.map((o: Observation, idx: number) => (
              <Fragment key={o._id}>
                {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
                <li>
                  <ObservationRow observation={o} />
                </li>
              </Fragment>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SignalRow({
  signal,
  onDraft,
  onResolve,
}: {
  signal: Signal;
  onDraft: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="flex items-start gap-6 py-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium ${SEVERITY_CHIP[signal.severity]}`}
          >
            {SEVERITY_LABEL[signal.severity]}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
            {signal.category}
          </span>
          {signal.status === "drafting" ? (
            <span className="text-[12px] font-medium text-provost-accent-blue">Drafting</span>
          ) : null}
        </div>
        <h3 className="mt-2 text-[22px] font-bold leading-[1.26] tracking-[-0.88px] text-provost-text-primary">
          {signal.title}
        </h3>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-primary">
          {signal.reason}
        </p>
        {signal.suggested_action ? (
          <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
            <span className="font-medium text-provost-text-primary">Suggested:</span>{" "}
            {signal.suggested_action}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDraft}
          className="h-[35px] rounded-full border border-provost-border-default bg-white px-4 text-[13px] font-medium text-provost-text-primary hover:bg-provost-bg-muted"
        >
          Draft revision →
        </button>
        <button
          type="button"
          onClick={onResolve}
          className="h-[35px] rounded-full px-4 text-[13px] font-medium text-provost-text-secondary hover:bg-provost-bg-muted"
        >
          Mark resolved
        </button>
      </div>
    </div>
  );
}

function ObservationRow({ observation }: { observation: Observation }) {
  return (
    <div className="flex items-start gap-6 py-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-700">
            Observation
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
            {observation.status}
          </span>
        </div>
        <h3 className="mt-2 text-[22px] font-bold leading-[1.26] tracking-[-0.88px] text-provost-text-primary">
          {observation.title}
        </h3>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-primary">
          {observation.description}
        </p>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          <span className="font-medium text-provost-text-primary">Why this matters:</span>{" "}
          {observation.why_this_matters}
        </p>
        <p className="mt-1 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          <span className="font-medium text-provost-text-primary">Recommendation:</span>{" "}
          {observation.recommendation}
        </p>
        {observation.next_best_actions.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
            {observation.next_best_actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
