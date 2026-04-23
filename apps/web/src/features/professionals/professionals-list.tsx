"use client";

import { Button } from "@provost/ui";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function ProfessionalsList() {
  const professionals = useQuery(api.professionals.list);

  if (professionals === undefined) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading…</div>;
  }

  if (professionals.length === 0) {
    return <div className="p-8 text-provost-text-secondary text-sm">No professionals yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {professionals.map((p) => (
        <article
          key={p._id}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-lg text-provost-text-primary">{p.name}</h2>
            <p className="text-provost-text-secondary text-sm">{p.profession}</p>
          </div>
          <div className="text-provost-text-secondary text-sm">
            <p>{p.firm}</p>
            <p className="truncate">{p.email}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
            <a href={`mailto:${p.email}`}>Contact</a>
          </Button>
        </article>
      ))}
    </div>
  );
}
