"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Icon,
  StatusChip,
} from "@provost/ui";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { RecapEditor } from "./recap-editor";
import { RsvpControl, type RsvpStatus } from "./rsvp-control";

function rsvpVariant(status: RsvpStatus): "success" | "observation" | "inactive" | "pending" {
  switch (status) {
    case "yes":
      return "success";
    case "maybe":
      return "observation";
    case "no":
      return "inactive";
    default:
      return "pending";
  }
}

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

export function EventDetail({
  eventId,
  open,
  onOpenChange,
  canEditRecap,
}: {
  eventId: Id<"events"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEditRecap: boolean;
}) {
  const event = useQuery(api.events.get, eventId && open ? { eventId } : "skip");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-h-[90vh] md:w-[clamp(320px,90vw,640px)]">
        {!event ? (
          <>
            <DialogHeader>
              <DialogTitle>Event</DialogTitle>
              <DialogDescription>Loading…</DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
              Loading event…
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <DialogDescription>{formatRange(event.starts_at, event.ends_at)}</DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[calc(90vh-120px)] flex-col gap-5 overflow-y-auto px-6 pb-6">
              <div className="flex items-center gap-2 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                <Icon
                  name={event.location_type === "video" ? "videocam" : "calendar_today"}
                  size={16}
                  weight={300}
                />
                <span className="capitalize">
                  {event.location_type === "video" ? "Video" : "In person"}
                </span>
                {event.location_detail && (
                  <>
                    <span aria-hidden>·</span>
                    {event.location_type === "video" &&
                    /^https?:\/\//.test(event.location_detail) ? (
                      <a
                        href={event.location_detail}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate underline underline-offset-2 hover:text-provost-text-primary"
                      >
                        {event.location_detail}
                      </a>
                    ) : (
                      <span className="truncate">{event.location_detail}</span>
                    )}
                  </>
                )}
              </div>

              {event.description && (
                <p className="whitespace-pre-wrap text-[14px] text-provost-text-primary tracking-[-0.42px]">
                  {event.description}
                </p>
              )}

              {event.agenda && (
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium text-[13px] text-provost-text-secondary uppercase tracking-[1px]">
                    Agenda
                  </h3>
                  <p className="whitespace-pre-wrap rounded-md border border-provost-border-subtle bg-white p-3 text-[14px] text-provost-text-primary tracking-[-0.42px]">
                    {event.agenda}
                  </p>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="font-medium text-[13px] text-provost-text-secondary uppercase tracking-[1px]">
                  Your RSVP
                </h3>
                {event.myRsvp === null ? (
                  <p className="text-[13px] text-provost-text-secondary italic tracking-[-0.39px]">
                    You are not invited to this event.
                  </p>
                ) : (
                  <RsvpControl eventId={event._id} current={event.myRsvp} />
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-medium text-[13px] text-provost-text-secondary uppercase tracking-[1px]">
                  Attendees ({event.attendees.length})
                </h3>
                <ul className="flex flex-col overflow-hidden rounded-md border border-provost-border-subtle bg-white">
                  {event.attendees.map((a, i) => (
                    <li
                      key={a._id}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        i > 0 ? "border-provost-border-subtle border-t" : ""
                      }`}
                    >
                      <span className="flex-1 truncate text-[14px] text-provost-text-primary tracking-[-0.42px]">
                        {a.name}
                      </span>
                      <StatusChip variant={rsvpVariant(a.rsvp_status)}>{a.rsvp_status}</StatusChip>
                    </li>
                  ))}
                </ul>
              </section>

              <RecapEditor eventId={event._id} initial={event.recap} canEdit={canEditRecap} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
