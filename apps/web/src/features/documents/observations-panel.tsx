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
      <div className="border-provost-border-default border-l p-4 text-provost-text-secondary text-sm">
        Loading observations…
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div className="border-provost-border-default border-l p-4 text-provost-text-secondary text-sm">
        No observations yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-provost-border-default border-l p-4">
      <h3 className="font-semibold text-provost-text-secondary text-sm uppercase tracking-wide">
        Observations
      </h3>
      {(observations as Doc<"observations">[]).map((obs: Doc<"observations">) => (
        <article
          key={obs._id}
          className="flex flex-col gap-2 rounded-md border border-provost-border-default bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-provost-text-primary text-sm">{obs.title}</h4>
            <span
              className={`rounded-full px-2 py-0.5 font-medium text-[10px] uppercase ${
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
          <p className="text-provost-text-secondary text-xs">{obs.description}</p>
          {obs.recommendation && (
            <p className="text-provost-text-primary text-xs">
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
