"use client";

// Issue 6.1 — advisor cross-family home (PRD §18).
//
// Renders only when the advisor is in aggregate view (no family scope).
// Pulls all data from `api.advisor.crossFamilyHighlights`, which strictly
// limits its return to summary counts + curated 5-item preview lists.

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useFamilyContext } from "@/context/family-context";
import { writeFamilyCookie } from "@/lib/family-cookie";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

function relativeTime(ts: number): string {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60_000);
  if (min < 60) return diff >= 0 ? `in ${min}m` : `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return diff >= 0 ? `in ${hr}h` : `${hr}h ago`;
  const days = Math.round(hr / 24);
  return diff >= 0 ? `in ${days}d` : `${days}d ago`;
}

function severityDot(severity: "new" | "read" | "done") {
  const color =
    severity === "new" ? "bg-red-600" : severity === "read" ? "bg-amber-500" : "bg-gray-400";
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

export function MultiFamilyHome() {
  const router = useRouter();
  const { setFamily, setAggregateView } = useFamilyContext();
  const data = useQuery(api.advisor.crossFamilyHighlights, {});
  const assigned = useQuery(api.advisor.assignedFamiliesSoft, {});

  if (assigned !== undefined && assigned.length === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-[776px] rounded-2xl border border-provost-border-subtle bg-white p-8 text-center">
          <h2 className="font-dm-serif text-2xl">No families assigned yet</h2>
          <p className="mt-2 text-[15px] text-provost-text-secondary">
            You haven&apos;t been assigned to any families yet. Contact your Provost admin to get
            access.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading aggregate…</div>;
  }

  function scopeAndNavigate(familyId: Id<"families">, familyName: string, path: string) {
    setAggregateView(false);
    setFamily({ _id: familyId, name: familyName, myRole: "advisor" });
    if (typeof window !== "undefined") localStorage.setItem("selectedFamilyId", familyId);
    writeFamilyCookie(familyId);
    router.push(path);
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1100px] space-y-4">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Pending observations" value={data.totalPendingObservations} />
          <StatTile label="Active members" value={data.totalActiveMembers} />
          <StatTile label="Active families" value={data.activeFamilies} />
          <StatTile label="Upcoming events" value={data.upcomingEventsCount} />
        </div>

        {/* Recent observations */}
        <Card title="Recent observations">
          {data.recentObservations.length === 0 ? (
            <p className="text-[14px] text-provost-text-secondary">
              No pending observations across your assigned families.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentObservations.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => scopeAndNavigate(o.familyId, o.familyName, "/estate")}
                    className="flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-provost-bg-secondary"
                  >
                    {severityDot(o.severity)}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px]">{o.title}</span>
                      <span className="text-provost-text-secondary text-xs">
                        {o.familyName} · {relativeTime(o.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming events */}
        <Card title="Upcoming events">
          {data.upcomingEvents.length === 0 ? (
            <p className="text-[14px] text-provost-text-secondary">
              No events scheduled in the next 14 days.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingEvents.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => scopeAndNavigate(e.familyId, e.familyName, "/events")}
                    className="flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-provost-bg-secondary"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px]">{e.title}</span>
                      <span className="text-provost-text-secondary text-xs">
                        {e.familyName} · {relativeTime(e.startAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Engagement */}
        <Card title="Engagement at a glance">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Engagement
              label="Active"
              value={data.engagementBuckets.active}
              hint="Touched a lesson in the last 14 days"
              tone="green"
            />
            <Engagement
              label="Stalled"
              value={data.engagementBuckets.stalled}
              hint="Some activity in 30-90 days, none recently"
              tone="amber"
            />
            <Engagement
              label="Idle"
              value={data.engagementBuckets.idle}
              hint="No lesson activity in 90+ days"
              tone="gray"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-provost-border-subtle bg-white p-4">
      <div className="font-dm-serif text-[34px] leading-tight">{value}</div>
      <div className="text-[13px] text-provost-text-secondary">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-provost-border-subtle bg-white p-5">
      <h3 className="mb-3 font-semibold text-[16px]">{title}</h3>
      {children}
    </section>
  );
}

function Engagement({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "green" | "amber" | "gray";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-provost-text-secondary";
  return (
    <div className="rounded-xl bg-provost-bg-secondary p-4">
      <div className={`font-dm-serif text-[28px] leading-tight ${toneClass}`}>{value}</div>
      <div className="font-medium text-[14px]">{label}</div>
      <div className="mt-1 text-provost-text-secondary text-xs">{hint}</div>
    </div>
  );
}
