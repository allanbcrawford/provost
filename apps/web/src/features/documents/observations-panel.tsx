"use client";

import { Button } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type ObservationsPanelProps = {
  familyId: Id<"families">;
  documentId?: Id<"documents">;
};

export function ObservationsPanel({ familyId, documentId }: ObservationsPanelProps) {
  const observations = useQuery(api.observations.listByFamily, {
    familyId,
    ...(documentId ? { documentId } : {}),
  });
  const markDone = useMutation(api.observations.markDone);

  if (observations === undefined) {
    return (
      <div className="border-l border-provost-border-default p-4 text-sm text-provost-text-secondary">
        Loading observations…
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div className="border-l border-provost-border-default p-4 text-sm text-provost-text-secondary">
        No observations yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-l border-provost-border-default p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-provost-text-secondary">
        Observations
      </h3>
      {(observations as Doc<"observations">[]).map((obs: Doc<"observations">) => (
        <article
          key={obs._id}
          className="flex flex-col gap-2 rounded-md border border-provost-border-default bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-provost-text-primary">{obs.title}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                obs.status === "done"
                  ? "bg-green-100 text-green-700"
                  : obs.status === "read"
                    ? "bg-neutral-100 text-neutral-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {obs.status}
            </span>
          </div>
          <p className="text-xs text-provost-text-secondary">{obs.description}</p>
          {obs.recommendation && (
            <p className="text-xs text-provost-text-primary">
              <span className="font-medium">Recommendation: </span>
              {obs.recommendation}
            </p>
          )}
          {obs.status !== "done" && (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => markDone({ observationId: obs._id })}
            >
              Mark done
            </Button>
          )}
        </article>
      ))}
    </div>
  );
}
