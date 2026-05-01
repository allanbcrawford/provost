"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Issue 6.2 — Fun Facts tab on the Family page. The existing detail route at
// /fun-facts/[funFactId] renders a single fact; this tab gives the family a
// surface to discover them.

export function FamilyFunFactsTab({ familyId }: { familyId?: Id<"families"> }) {
  const facts = useQuery(
    api.familyHistory.listFunFacts,
    familyId ? { familyId } : "skip",
  );

  if (!familyId || facts === undefined) {
    return (
      <div className="p-8 text-[13px] text-provost-text-secondary">Loading fun facts…</div>
    );
  }

  if (facts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-16">
        <h2 className="font-dm-serif text-[24px] text-provost-text-primary">
          No fun facts yet
        </h2>
        <p className="mt-3 max-w-md text-center font-light text-[14px] text-provost-text-secondary">
          As Provost learns about your family, fun facts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facts.map((f) => (
          <li key={f._id}>
            <Link
              href={`/fun-facts/${f._id}`}
              className="block rounded-lg border border-provost-border-subtle bg-white p-5 transition-colors hover:border-provost-border-strong"
            >
              <div className="text-[11px] uppercase tracking-wider text-provost-text-tertiary">
                {f.category}
              </div>
              <h3 className="mt-1 font-medium text-[16px] text-provost-text-primary">
                {f.title}
              </h3>
              <p className="mt-2 line-clamp-3 font-light text-[13px] text-provost-text-secondary">
                {f.body}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
