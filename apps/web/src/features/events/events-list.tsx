"use client";

import { Icon } from "@provost/ui";
import { Fragment } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Row = {
  _id: Id<"events">;
  title: string;
  description: string;
  starts_at: number;
  ends_at: number;
  location_type: "in_person" | "video";
  location_detail: string | null;
  attendeeCount: number;
};

function formatRange(starts: number, ends: number): string {
  const s = new Date(starts);
  const e = new Date(ends);
  const sameDay = s.toDateString() === e.toDateString();
  const dateLabel = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const sTime = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const eTime = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `${dateLabel} · ${sTime} – ${eTime}`;
  return `${dateLabel} ${sTime} → ${e.toLocaleDateString()} ${eTime}`;
}

export function EventsList({
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
  return (
    <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      {events.map((e, i) => (
        <Fragment key={e._id}>
          {i > 0 && <li aria-hidden className="h-px bg-provost-border-subtle" />}
          <li
            className={`flex items-start gap-5 px-5 py-4 ${
              onSelect
                ? "cursor-pointer focus-within:bg-provost-bg-secondary hover:bg-provost-bg-secondary"
                : ""
            }`}
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
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
              <Icon
                name={e.location_type === "video" ? "videocam" : "calendar_today"}
                size={20}
                weight={300}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[16px] text-provost-text-primary tracking-[-0.48px]">
                {e.title}
              </div>
              <div className="mt-0.5 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                {formatRange(e.starts_at, e.ends_at)} · {e.attendeeCount} attendee
                {e.attendeeCount === 1 ? "" : "s"}
                {e.location_detail ? ` · ${e.location_detail}` : ""}
              </div>
              {e.description && (
                <div className="mt-2 line-clamp-2 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                  {e.description}
                </div>
              )}
            </div>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
