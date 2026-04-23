"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type Category = "mutation" | "tool_call" | "run" | "auth" | "approval";
const CATEGORIES: (Category | "all")[] = [
  "all",
  "mutation",
  "tool_call",
  "run",
  "auth",
  "approval",
];

export function AuditLog({ familyId }: { familyId: Id<"families"> }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  const events = useQuery(api.governance.auditEvents, {
    familyId,
    category: category === "all" ? undefined : category,
    limit: 200,
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return (events as Doc<"audit_events">[]).filter((e: Doc<"audit_events">) =>
      [e.action, e.resource_type ?? "", e.resource_id ?? "", e.category].some((s: string) =>
        s.toLowerCase().includes(q),
      ),
    );
  }, [events, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search action, resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
        />
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                category === c
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-provost-text-secondary hover:border-neutral-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {events === undefined ? (
        <div className="text-provost-text-secondary text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-neutral-200 border-dashed p-8 text-center text-provost-text-secondary text-sm">
          No audit events yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-provost-text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Resource</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: Doc<"audit_events">) => (
                <tr key={e._id} className="border-neutral-100 border-t">
                  <td className="px-4 py-2 text-provost-text-secondary">
                    {new Date(e._creationTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">{e.category}</span>
                  </td>
                  <td className="px-4 py-2 text-provost-text-secondary">{e.actor_kind}</td>
                  <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-2 text-provost-text-secondary text-xs">
                    {e.resource_type ? `${e.resource_type}:${e.resource_id ?? "—"}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
