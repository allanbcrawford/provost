"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type Status = "open" | "in_progress" | "completed" | "cancelled";
const STATUS_FILTERS: (Status | "all")[] = ["all", "open", "in_progress", "completed", "cancelled"];

const STATUS_STYLES: Record<Status, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-neutral-200 text-neutral-700",
};

export function TasksList({ familyId }: { familyId: Id<"families"> }) {
  const [status, setStatus] = useState<Status | "all">("all");
  const tasks = useQuery(api.governance.tasks, {
    familyId,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {STATUS_FILTERS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              status === s
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-provost-text-secondary hover:border-neutral-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {tasks === undefined ? (
        <div className="text-provost-text-secondary text-sm">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-md border border-neutral-200 border-dashed p-8 text-center text-provost-text-secondary text-sm">
          No tasks.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {(tasks as Doc<"tasks">[]).map((t: Doc<"tasks">) => (
            <li
              key={t._id}
              className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-medium text-provost-text-primary text-sm">{t.title}</h3>
                <p className="text-provost-text-secondary text-xs">{t.body}</p>
                <p className="text-provost-text-muted text-xs">
                  Assignee: {t.assignee_type}
                  {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString()}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs ${STATUS_STYLES[t.status as Status]}`}
              >
                {t.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
