"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Props = { familyId: Id<"families"> };

function jan1Epoch(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), 0, 1);
}

function formatCurrencyShort(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
      notation: value >= 1_000_000 ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

function formatDate(date: number): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AssetsTrendChart({ familyId }: Props) {
  const since = jan1Epoch();
  const series = useQuery(api.assets.historyForFamily, { familyId, since });

  const ytd = useMemo(() => {
    if (!series || series.length < 2) return null;
    const start = series[0]?.total ?? 0;
    const end = series[series.length - 1]?.total ?? 0;
    if (start === 0) return null;
    return ((end - start) / start) * 100;
  }, [series]);

  if (series === undefined) {
    return (
      <div className="h-[180px] animate-pulse rounded-md border border-provost-border-subtle bg-provost-bg-secondary" />
    );
  }
  if (series.length < 2) {
    return (
      <div className="rounded-md border border-provost-border-subtle bg-white p-4 text-[13px] text-provost-text-secondary">
        Trend chart appears once we have at least two snapshots. New assets capture today's snapshot
        automatically; the monthly cron fills in the rest.
      </div>
    );
  }

  const currency = series[0]?.currency ?? "USD";
  const data = series.map((s) => ({
    date: s.date,
    label: formatDate(s.date),
    total: s.total,
  }));

  return (
    <div className="rounded-md border border-provost-border-subtle bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-medium text-[15px] text-provost-text-primary">Wealth over time</h3>
        {ytd !== null && (
          <span
            className={`font-medium text-[13px] tabular-nums ${
              ytd >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {ytd >= 0 ? "+" : ""}
            {ytd.toFixed(1)}% YTD
          </span>
        )}
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--provost-border-subtle)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--provost-text-tertiary)" />
            <YAxis
              tickFormatter={(v: number) => formatCurrencyShort(v, currency)}
              tick={{ fontSize: 11 }}
              stroke="var(--provost-text-tertiary)"
              width={70}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? formatCurrencyShort(value, currency) : String(value)
              }
              labelClassName="text-provost-text-primary"
            />
            <Line type="monotone" dataKey="total" stroke="#2c67a0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
