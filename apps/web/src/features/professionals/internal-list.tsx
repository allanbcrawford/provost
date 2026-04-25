"use client";

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import { Fragment } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Row = {
  user_id: Id<"users">;
  name: string;
  email: string;
  family_role: string;
  employment_role: string | null;
};

export function InternalList() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const rows = useQuery(api.professionals.listInternal, familyId ? { familyId } : "skip") as
    | Row[]
    | undefined;

  if (rows === undefined) {
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No internal team members yet. Tag a family member with an employment role to surface them
        here.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      {rows.map((p, i) => (
        <Fragment key={p.user_id}>
          {i > 0 && <li aria-hidden className="h-px bg-provost-border-subtle" />}
          <li className="flex items-center gap-5 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
              <Icon name="badge" size={20} weight={300} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-[16px] text-provost-text-primary tracking-[-0.48px]">
                {p.name}
              </div>
              <div className="mt-0.5 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                {p.employment_role ?? "—"} · {p.family_role}
              </div>
            </div>
            <a
              href={`mailto:${p.email}`}
              className="text-[13px] text-provost-text-secondary tracking-[-0.39px] hover:text-provost-text-primary"
            >
              {p.email}
            </a>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
