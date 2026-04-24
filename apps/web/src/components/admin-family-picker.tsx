"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Family = {
  _id: Id<"families">;
  name: string;
  description: string | null;
  member_count: number;
};

export type AdminFamilyPickerProps = {
  value: Id<"families"> | null;
  onChange: (id: Id<"families"> | null) => void;
};

export function AdminFamilyPicker({ value, onChange }: AdminFamilyPickerProps) {
  const families = useQuery(api.users.listFamiliesForSiteAdmin, {}) as Family[] | undefined;

  if (families === undefined) {
    return <div className="mb-6 text-[13px] text-provost-text-secondary">Loading families…</div>;
  }
  if (families.length === 0) {
    return <div className="mb-6 text-[13px] text-provost-text-secondary">No families yet.</div>;
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <label
        htmlFor="admin-family-select"
        className="text-[12px] font-semibold uppercase tracking-[0.1em] text-provost-text-tertiary"
      >
        Family
      </label>
      <select
        id="admin-family-select"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as Id<"families"> | null)}
        className="h-[36px] rounded-[8px] border border-provost-border-subtle bg-white px-3 text-[14px] tracking-[-0.42px] text-provost-text-primary focus:border-provost-text-primary focus:outline-none"
      >
        <option value="">Select a family…</option>
        {families.map((f) => (
          <option key={f._id} value={f._id}>
            {f.name} ({f.member_count})
          </option>
        ))}
      </select>
    </div>
  );
}
