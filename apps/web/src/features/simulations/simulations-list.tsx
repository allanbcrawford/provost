"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";

type SavedSimulation = {
  _id: Id<"waterfalls">;
  _creationTime: number;
  name: string;
  state: unknown;
};

type Props = {
  saved: SavedSimulation[];
  onNew: () => void;
  onOpen: (sim: SavedSimulation) => void;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SimulationsList({ saved, onNew, onOpen }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={onNew}
        className="group flex min-h-[180px] flex-col items-start justify-between rounded-[14px] border border-provost-accent-blue/40 border-dashed bg-provost-accent-blue/5 p-6 text-left transition hover:border-provost-accent-blue hover:bg-provost-accent-blue/10"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-provost-accent-blue/15 text-provost-accent-blue">
          <span className="material-symbols-outlined text-[22px]">add</span>
        </span>
        <span>
          <p className="font-dm-serif font-medium text-[22px] text-provost-text-primary leading-[1.1] tracking-[-0.44px]">
            New Inheritance Waterfall
          </p>
          <p className="mt-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
            Model how amendments reshape the estate flow.
          </p>
        </span>
      </button>

      {saved.map((sim) => (
        <div
          key={sim._id}
          className="flex min-h-[180px] flex-col justify-between rounded-[14px] border border-provost-border-subtle bg-white p-6"
        >
          <div>
            <p className="font-semibold text-[11px] text-provost-text-tertiary uppercase tracking-wider">
              Inheritance Waterfall
            </p>
            <p className="mt-2 font-dm-serif font-medium text-[22px] text-provost-text-primary leading-[1.1] tracking-[-0.44px]">
              {sim.name}
            </p>
            <p className="mt-1 text-[13px] text-provost-text-tertiary tracking-[-0.39px]">
              Saved {formatDate(sim._creationTime)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpen(sim)}
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-provost-border-subtle bg-provost-bg-muted px-4 py-1.5 font-medium text-[13px] text-provost-text-primary hover:bg-provost-bg-primary"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Open
          </button>
        </div>
      ))}
    </div>
  );
}

export type { SavedSimulation };
