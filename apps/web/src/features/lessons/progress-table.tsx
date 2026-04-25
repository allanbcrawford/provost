"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";

type ProgressRow = {
  user_id: Id<"users">;
  name: string;
  role: string;
  stewardship_phase: string | null;
  completed: number;
  active: number;
  total: number;
};

const PHASE_LABEL: Record<string, string> = {
  emerging: "Emerging",
  developing: "Developing",
  operating: "Operating",
  enduring: "Enduring",
};

export function ProgressTable({ rows }: { rows: ProgressRow[] | null }) {
  if (rows === null) {
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No members yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      <table className="w-full text-left text-[14px] tracking-[-0.42px]">
        <thead className="bg-provost-bg-muted/40 font-medium text-[12px] text-provost-text-secondary uppercase tracking-[1px]">
          <tr>
            <th className="px-5 py-3">Member</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Phase</th>
            <th className="px-5 py-3">Active</th>
            <th className="px-5 py-3">Completed</th>
            <th className="px-5 py-3">Total in family</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} className="border-provost-border-subtle border-t">
              <td className="px-5 py-3 font-medium text-provost-text-primary">{r.name}</td>
              <td className="px-5 py-3 text-provost-text-secondary">{r.role}</td>
              <td className="px-5 py-3 text-provost-text-secondary">
                {r.stewardship_phase
                  ? (PHASE_LABEL[r.stewardship_phase] ?? r.stewardship_phase)
                  : "—"}
              </td>
              <td className="px-5 py-3 text-provost-text-secondary">{r.active}</td>
              <td className="px-5 py-3 text-provost-text-secondary">{r.completed}</td>
              <td className="px-5 py-3 text-provost-text-secondary">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
