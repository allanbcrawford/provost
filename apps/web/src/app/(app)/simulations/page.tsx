"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { type SavedSimulation, SimulationsList } from "@/features/simulations/simulations-list";
import type { CustomEdits, RevisionState } from "@/features/waterfall/types";
import { WaterfallModal } from "@/features/waterfall/waterfall-modal";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type WaterfallSavedState = {
  revisions?: RevisionState;
  customEdits?: CustomEdits;
};

function SimulationsPage() {
  const family = useSelectedFamily();
  const saved = useQuery(
    api.simulations.listSaved,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  const [open, setOpen] = useState(false);
  const [initialState, setInitialState] = useState<WaterfallSavedState | null>(null);

  if (!family) {
    return (
      <div className="p-8 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        Select a family first.
      </div>
    );
  }

  const handleOpen = (sim: SavedSimulation) => {
    setInitialState((sim.state ?? null) as WaterfallSavedState | null);
    setOpen(true);
  };

  const handleNew = () => {
    setInitialState(null);
    setOpen(true);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Simulations
        </h1>
        <p className="mt-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
          Explore hypothetical outcomes and save scenarios for later review.
        </p>
      </div>
      <SimulationsList saved={saved ?? []} onNew={handleNew} onOpen={handleOpen} />
      <WaterfallModal
        open={open}
        onClose={() => setOpen(false)}
        initialRevisions={initialState?.revisions}
        initialCustomEdits={initialState?.customEdits}
      />
    </div>
  );
}

export default withRoleGuard(SimulationsPage, APP_ROLES.SIMULATIONS ?? []);
