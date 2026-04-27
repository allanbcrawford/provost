"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type LocationType = "in_person" | "video";

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

function plusHourLocal(value: string): string {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return value;
  return toDatetimeLocalValue(new Date(ms + 60 * 60 * 1000));
}

export function EventFormModal({
  open,
  onOpenChange,
  familyId,
  currentUserId,
  onCreated,
  initialStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: Id<"families">;
  currentUserId: Id<"users"> | null;
  onCreated?: (eventId: Id<"events">) => void;
  initialStart?: number | null;
}) {
  const contacts = useQuery(api.events.listEventableContacts, open ? { familyId } : "skip");
  const createEvent = useMutation(api.events.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState<string>(defaultStart());
  const [end, setEnd] = useState<string>(plusHourLocal(defaultStart()));
  const [locationType, setLocationType] = useState<LocationType>("video");
  const [locationDetail, setLocationDetail] = useState("");
  const [agenda, setAgenda] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep `end` >= `start` when start changes.
  useEffect(() => {
    if (!start) return;
    if (!end || new Date(end).getTime() < new Date(start).getTime()) {
      setEnd(plusHourLocal(start));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  // Apply caller-provided initial start when the modal opens (e.g. user
  // clicked an empty calendar day).
  useEffect(() => {
    if (!open || initialStart === null || initialStart === undefined) return;
    const d = new Date(initialStart);
    // If the timestamp is a date-only midnight, default to 9am local for
    // a sensible meeting time.
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(9);
    const s = toDatetimeLocalValue(d);
    setStart(s);
    setEnd(plusHourLocal(s));
  }, [open, initialStart]);

  // Reset on close.
  useEffect(() => {
    if (open) return;
    setTitle("");
    setDescription("");
    const s = defaultStart();
    setStart(s);
    setEnd(plusHourLocal(s));
    setLocationType("video");
    setLocationDetail("");
    setAgenda("");
    setSelected(new Set());
    setSubmitting(false);
    setError(null);
  }, [open]);

  const eligibleUsers = useMemo(
    () => (contacts?.users ?? []).filter((u) => u.user_id !== currentUserId),
    [contacts, currentUserId],
  );

  function toggleAttendee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const startsAt = new Date(start).getTime();
    const endsAt = new Date(end).getTime();
    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      setError("Please pick valid start and end times.");
      return;
    }
    if (endsAt < startsAt) {
      setError("End must be after start.");
      return;
    }
    setSubmitting(true);
    try {
      const eventId = await createEvent({
        familyId,
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt,
        endsAt,
        locationType,
        locationDetail: locationDetail.trim() || undefined,
        agenda: agenda.trim() || undefined,
        attendeeUserIds: Array.from(selected) as Id<"users">[],
      });
      onCreated?.(eventId);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create event. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:w-[clamp(320px,90vw,640px)]">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>
            Schedule a meeting, send invites, and capture an agenda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q2 family meeting"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-provost-border-subtle bg-white px-3 py-2 text-[14px] text-provost-text-primary tracking-[-0.42px] placeholder:text-provost-text-secondary focus:outline-none focus:ring-2 focus:ring-provost-border-default"
              placeholder="Short description (optional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Ends</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-location-type">Location type</Label>
              <select
                id="event-location-type"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType)}
                className="h-10 rounded-md border border-provost-border-subtle bg-white px-3 text-[14px] text-provost-text-primary tracking-[-0.42px] focus:outline-none focus:ring-2 focus:ring-provost-border-default"
              >
                <option value="video">Video</option>
                <option value="in_person">In person</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-location-detail">
                {locationType === "video" ? "Meeting link" : "Address"}
              </Label>
              <Input
                id="event-location-detail"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder={
                  locationType === "video" ? "https://meet.example.com/..." : "123 Main St"
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-agenda">Agenda</Label>
            <textarea
              id="event-agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-provost-border-subtle bg-white px-3 py-2 text-[14px] text-provost-text-primary tracking-[-0.42px] placeholder:text-provost-text-secondary focus:outline-none focus:ring-2 focus:ring-provost-border-default"
              placeholder="Topics to cover (one per line)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Attendees</Label>
            {contacts === undefined ? (
              <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                Loading contacts…
              </p>
            ) : eligibleUsers.length === 0 ? (
              <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                No other family members to invite.
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-provost-border-subtle bg-white p-1">
                {eligibleUsers.map((u) => (
                  <label
                    key={u.user_id}
                    className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-provost-bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(u.user_id)}
                      onChange={() => toggleAttendee(u.user_id)}
                      className="h-4 w-4 rounded border-provost-border-subtle"
                    />
                    <span className="flex-1 text-[14px] text-provost-text-primary tracking-[-0.42px]">
                      {u.name}
                    </span>
                    <span className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                      {u.family_role}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {contacts && contacts.professionals.length > 0 && (
              <p className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                External professionals are read-only here. To include one, add them as a family
                member first.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
