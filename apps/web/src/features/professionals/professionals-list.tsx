"use client";

import { Button, Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import { Fragment } from "react";
import { useFamilyContext } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";

export function ProfessionalsList() {
  const { family } = useFamilyContext();
  const professionals = useQuery(
    api.professionals.list,
    family?._id ? { familyId: family._id } : "skip",
  );

  if (professionals === undefined) {
    return (
      <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No professionals yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {(professionals as Doc<"professionals">[]).map((p, idx) => (
        <Fragment key={p._id}>
          {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
          <li className="flex items-start gap-6 py-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
              <Icon name="person" size={28} weight={300} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[22px] font-bold leading-[1.26] tracking-[-0.88px] text-provost-text-primary">
                {p.name}
              </h3>
              <p className="mt-1 text-[16px] font-light leading-[1.26] tracking-[-0.48px] text-provost-text-secondary">
                {p.profession}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[14px] tracking-[-0.42px] text-provost-neutral-600">
                <span className="font-light">{p.firm}</span>
                <span
                  aria-hidden
                  className="size-[3px] shrink-0 rounded-full bg-provost-neutral-600"
                />
                <span className="truncate font-light">{p.email}</span>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-[35px] shrink-0 rounded-full px-5 text-[13px] font-medium"
            >
              <a href={`mailto:${p.email}`}>Contact</a>
            </Button>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
