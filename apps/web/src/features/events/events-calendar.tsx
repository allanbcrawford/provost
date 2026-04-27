"use client";

import { Icon } from "@provost/ui";
import { useMemo, useState } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Row = {
  _id: Id<"events">;
  title: string;
  starts_at: number;
  ends_at: number;
  location_type: "in_person" | "video";
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dayKeyForTs(ts: number): string {
  const d = new Date(ts);
  return dayKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function midnightTimestamp(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

export function EventsCalendar({
  events,
  onSelect,
  onCreateAt,
}: {
  events: Row[] | null;
  onSelect?: (id: Id<"events">) => void;
  onCreateAt?: (ts: number) => void;
}) {
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

  const grouped = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const e of events ?? []) {
      const k = dayKeyForTs(e.starts_at);
      const list = groups.get(k) ?? [];
      list.push(e);
      groups.set(k, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.starts_at - b.starts_at);
    }
    return groups;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Build a 6-row × 7-col grid covering the visible month + leading/trailing
  // days of adjacent months so the grid always has a stable shape.
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  // Leading days from previous month.
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1]?.date ?? new Date(year, month, daysInMonth);
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: next.getMonth() === month });
    if (cells.length >= 42) break;
  }

  function gotoPrev() {
    setCursor(new Date(year, month - 1, 1));
  }
  function gotoNext() {
    setCursor(new Date(year, month + 1, 1));
  }
  function gotoToday() {
    setCursor(startOfMonth(new Date()));
  }

  const todayKey = dayKeyForTs(Date.now());

  if (events === null) {
    return <p className="text-[14px] text-provost-text-secondary">Loading…</p>;
  }

  // Below 640px, fall back to a simple agenda list grouped by day. Real grids
  // with 7 columns get unreadable on phones.
  return (
    <>
      <div className="hidden sm:block">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-medium text-[18px] text-provost-text-primary tracking-[-0.54px]">
            {monthLabel}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={gotoPrev}
              className="flex size-8 items-center justify-center rounded-md text-provost-text-secondary hover:bg-provost-bg-secondary"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <button
              type="button"
              onClick={gotoToday}
              className="rounded-md border border-provost-border-subtle bg-white px-3 py-1 text-[12px] text-provost-text-secondary hover:bg-provost-bg-secondary"
            >
              Today
            </button>
            <button
              type="button"
              onClick={gotoNext}
              className="flex size-8 items-center justify-center rounded-md text-provost-text-secondary hover:bg-provost-bg-secondary"
              aria-label="Next month"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[12px] border border-provost-border-subtle bg-provost-border-subtle">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="bg-white px-2 py-1.5 text-center font-medium text-[11px] text-provost-text-secondary uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const k = dayKey(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEvents = grouped.get(k) ?? [];
            const isToday = k === todayKey;
            const ts = midnightTimestamp(date.getFullYear(), date.getMonth(), date.getDate());
            const isClickable = onCreateAt && dayEvents.length === 0;
            return (
              <button
                key={k}
                type="button"
                onClick={isClickable ? () => onCreateAt?.(ts) : undefined}
                tabIndex={isClickable ? 0 : -1}
                disabled={!isClickable}
                className={`min-h-[110px] cursor-default bg-white p-2 text-left ${
                  isClickable ? "hover:bg-provost-bg-secondary cursor-pointer" : ""
                } ${inMonth ? "" : "bg-provost-bg-secondary/30"}`}
                aria-label={
                  dayEvents.length > 0
                    ? `${date.toDateString()} — ${dayEvents.length} event(s)`
                    : `${date.toDateString()}${isClickable ? ", click to create event" : ""}`
                }
              >
                <div
                  className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-[12px] ${
                    isToday
                      ? "bg-provost-bg-inverse font-semibold text-provost-text-inverse"
                      : inMonth
                        ? "text-provost-text-primary"
                        : "text-provost-text-tertiary"
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <EventChip key={e._id} event={e} onSelect={onSelect} />
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10.5px] text-provost-text-secondary">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile fallback: agenda list. */}
      <div className="sm:hidden">
        <AgendaList events={events} onSelect={onSelect} />
      </div>
    </>
  );
}

function EventChip({ event, onSelect }: { event: Row; onSelect?: (id: Id<"events">) => void }) {
  const start = new Date(event.starts_at);
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <button
      type="button"
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(event._id);
            }
          : undefined
      }
      className="truncate rounded-sm bg-provost-accent-blue/10 px-1.5 py-0.5 text-left text-[10.5px] text-provost-text-primary hover:bg-provost-accent-blue/20"
    >
      <span className="font-medium tabular-nums">{time}</span>{" "}
      <span className="text-provost-text-secondary">{event.title}</span>
    </button>
  );
}

function AgendaList({
  events,
  onSelect,
}: {
  events: Row[];
  onSelect?: (id: Id<"events">) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-provost-border-subtle border-dashed bg-white p-6 text-center text-[13px] text-provost-text-secondary">
        No events scheduled.
      </div>
    );
  }
  const groups = new Map<string, Row[]>();
  for (const e of events) {
    const k = dayKeyForTs(e.starts_at);
    const list = groups.get(k) ?? [];
    list.push(e);
    groups.set(k, list);
  }
  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.keys())
        .sort()
        .map((k) => (
          <div key={k}>
            <div className="mb-1 text-[11px] text-provost-text-secondary uppercase tracking-wider">
              {new Date(`${k}T00:00`).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <ul className="rounded-md border border-provost-border-subtle bg-white">
              {groups.get(k)?.map((e, i) => (
                <li
                  key={e._id}
                  className={`px-3 py-2 ${i > 0 ? "border-provost-border-subtle border-t" : ""}`}
                >
                  <button
                    type="button"
                    onClick={onSelect ? () => onSelect(e._id) : undefined}
                    className="w-full text-left"
                  >
                    <div className="font-medium text-[13px] text-provost-text-primary">
                      {e.title}
                    </div>
                    <div className="text-[11px] text-provost-text-secondary">
                      {new Date(e.starts_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
