"use client";

// Multi-line cumulative-completions chart for the Education > Progress tab.
// One line per family member, color-coded by stewardship phase. Powers the
// PRO-135 / Issue 3.3 visualization. Uses Recharts (already a dep).
//
// Data shape comes from `api.lessons.familyProgressOverview`:
//   completionByDate: Array<{ date: 'YYYY-MM-DD', completedCount: number }>
//
// We pivot the per-member series into a single rows-by-date table so all
// members render on a shared x-axis. Missing days for a given member are
// filled forward from the last known cumulative count so lines stay
// monotonic instead of dipping to zero on gap days.

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MemberSeries = {
  memberId: string;
  memberName: string;
  stewardshipPhase: string | null;
  programName: string | null;
  completedLessonCount: number;
  totalLessonCount: number;
  completionByDate: Array<{ date: string; completedCount: number }>;
};

type Props = {
  members: MemberSeries[] | null;
};

// Phase color palette. Picked to be distinct against the white panel and to
// echo the phase chips elsewhere in the app. If the design system later
// publishes phase tokens, swap these for var(--provost-phase-*).
const PHASE_COLOR: Record<string, string> = {
  emerging: "#2563eb", // blue-600
  developing: "#0d9488", // teal-600
  operating: "#d97706", // amber-600
  enduring: "#7c3aed", // violet-600
};
const FALLBACK_COLOR = "#6b7280"; // neutral-500 when phase is null

function colorFor(phase: string | null, memberIndex: number): string {
  if (phase && PHASE_COLOR[phase]) return PHASE_COLOR[phase];
  // Slight rotation so multiple un-phased members don't fully overlap.
  const fallbacks = ["#6b7280", "#475569", "#334155", "#1f2937"];
  return fallbacks[memberIndex % fallbacks.length] ?? FALLBACK_COLOR;
}

function formatDate(iso: string): string {
  // iso is YYYY-MM-DD. Render compact month/day.
  const [y, m, d] = iso.split("-").map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function StewardshipPhaseChart({ members }: Props) {
  const { rows, memberKeys } = useMemo(() => {
    if (!members || members.length === 0) return { rows: [], memberKeys: [] as MemberSeries[] };

    // Collect every distinct date across members and sort ascending.
    const allDates = new Set<string>();
    for (const m of members) {
      for (const point of m.completionByDate) allDates.add(point.date);
    }
    const sortedDates = [...allDates].sort();

    // For each member, build a date -> count map so we can fill-forward.
    const memberMaps = members.map((m) => {
      const byDate = new Map<string, number>();
      for (const p of m.completionByDate) byDate.set(p.date, p.completedCount);
      return { member: m, byDate };
    });

    type Row = { date: string; label: string } & Record<string, number | string>;
    const out: Row[] = [];
    const lastSeen = new Map<string, number>();
    for (const date of sortedDates) {
      const row: Row = { date, label: formatDate(date) };
      for (const { member, byDate } of memberMaps) {
        const explicit = byDate.get(date);
        if (typeof explicit === "number") {
          lastSeen.set(member.memberId, explicit);
          row[member.memberId] = explicit;
        } else {
          row[member.memberId] = lastSeen.get(member.memberId) ?? 0;
        }
      }
      out.push(row);
    }
    return { rows: out, memberKeys: members };
  }, [members]);

  if (members === null) {
    return (
      <div className="h-[280px] animate-pulse rounded-[14px] border border-provost-border-subtle bg-provost-bg-secondary" />
    );
  }
  if (members.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No member progress to chart yet.
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-provost-border-subtle bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-[14px] text-provost-text-primary tracking-[-0.42px]">
          Lessons completed (last 90 days)
        </h3>
        <span className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
          One line per family member, colored by stewardship phase
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--provost-text-secondary)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(15,23,42,0.1)" }}
            minTickGap={32}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--provost-text-secondary)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(15,23,42,0.1)" }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.1)",
              fontSize: 12,
            }}
            formatter={(value, _name, ctx) => {
              const numeric =
                typeof value === "number" ? value : Number(Array.isArray(value) ? value[0] : value);
              const key =
                typeof ctx?.dataKey === "string" || typeof ctx?.dataKey === "number"
                  ? String(ctx.dataKey)
                  : "";
              const m = memberKeys.find((mm) => mm.memberId === key);
              return [
                `${numeric} lesson${numeric === 1 ? "" : "s"}`,
                m ? m.memberName : key,
              ];
            }}
            labelFormatter={(label) => (typeof label === "string" ? label : "")}
          />
          <Legend
            verticalAlign="top"
            align="left"
            iconType="circle"
            wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
            formatter={(value: string) => {
              const m = memberKeys.find((mm) => mm.memberId === value);
              return m ? m.memberName : value;
            }}
          />
          {memberKeys.map((m, idx) => (
            <Line
              key={m.memberId}
              type="monotone"
              dataKey={m.memberId}
              name={m.memberId}
              stroke={colorFor(m.stewardshipPhase, idx)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
