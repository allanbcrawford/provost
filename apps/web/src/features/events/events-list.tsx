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

export function EventsList({ events }: { events: Row[] | null }) {
  if (events === null) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (events.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No events scheduled.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      {events.map((e, i) => (
        <Fragment key={e._id}>
          {i > 0 && <li aria-hidden className="h-px bg-provost-border-subtle" />}
          <li className="flex items-start gap-5 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
              <Icon
                name={e.location_type === "video" ? "videocam" : "calendar_today"}
                size={20}
                weight={300}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-medium tracking-[-0.48px] text-provost-text-primary">
                {e.title}
              </div>
              <div className="mt-0.5 text-[12px] tracking-[-0.36px] text-provost-text-secondary">
                {formatRange(e.starts_at, e.ends_at)} · {e.attendeeCount} attendee
                {e.attendeeCount === 1 ? "" : "s"}
                {e.location_detail ? ` · ${e.location_detail}` : ""}
              </div>
              {e.description && (
                <div className="mt-2 line-clamp-2 text-[13px] tracking-[-0.39px] text-provost-text-secondary">
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
