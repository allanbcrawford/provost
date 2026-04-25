"use client";

import { Icon } from "@provost/ui";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Row = {
  _id: Id<"events">;
  title: string;
  starts_at: number;
  ends_at: number;
  location_type: "in_person" | "video";
};

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatDayLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Lightweight "calendar" — events grouped by day. A real grid view is a v1.5
// follow-up; this is enough to skim a month at a time.
export function EventsCalendar({
  events,
  onSelect,
}: {
  events: Row[] | null;
  onSelect?: (id: Id<"events">) => void;
}) {
  if (events === null) {
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (events.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No events scheduled.
      </div>
    );
  }
  const groups = new Map<string, Row[]>();
  for (const e of events) {
    const key = dayKey(e.starts_at);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const orderedKeys = Array.from(groups.keys()).sort();
  return (
    <div className="flex flex-col gap-5">
      {orderedKeys.map((key) => (
        <div key={key}>
          <div className="mb-2 text-[12px] text-provost-text-secondary uppercase tracking-[1px]">
            {formatDayLabel(key)}
          </div>
          <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
            {groups.get(key)?.map((e, i) => {
              const start = new Date(e.starts_at);
              const end = new Date(e.ends_at);
              return (
                <li
                  key={e._id}
                  className={`flex items-center gap-4 px-5 py-3 ${
                    i > 0 ? "border-provost-border-subtle border-t" : ""
                  } ${onSelect ? "cursor-pointer hover:bg-provost-bg-secondary" : ""}`}
                  onClick={onSelect ? () => onSelect(e._id) : undefined}
                  onKeyDown={
                    onSelect
                      ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            onSelect(e._id);
                          }
                        }
                      : undefined
                  }
                  role={onSelect ? "button" : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                >
                  <Icon
                    name={e.location_type === "video" ? "videocam" : "calendar_today"}
                    size={18}
                    weight={300}
                    className="text-provost-text-secondary"
                  />
                  <div className="whitespace-nowrap font-medium text-[13px] text-provost-text-primary tracking-[-0.39px]">
                    {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" – "}
                    {end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-[14px] text-provost-text-primary tracking-[-0.42px]">
                    {e.title}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
