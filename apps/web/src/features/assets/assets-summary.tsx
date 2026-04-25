"use client";

type Summary = {
  total: number;
  currency: string;
  byType: { type: string; value: number }[];
  count: number;
};

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function AssetsSummary({ summary }: { summary: Summary | null }) {
  if (summary === null) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (summary.count === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No assets yet.
      </div>
    );
  }
  return (
    <div className="rounded-[14px] border border-provost-border-subtle bg-white p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[12px] uppercase tracking-[1px] text-provost-text-secondary">
            Total
          </div>
          <div className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
            {formatCurrency(summary.total, summary.currency)}
          </div>
        </div>
        <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          {summary.count} asset{summary.count === 1 ? "" : "s"}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {summary.byType.map((b) => (
          <div key={b.type} className="rounded-[10px] bg-provost-bg-muted/50 p-4">
            <div className="text-[12px] tracking-[-0.36px] text-provost-text-secondary">
              {b.type}
            </div>
            <div className="mt-1 text-[18px] font-medium tracking-[-0.54px] text-provost-text-primary">
              {formatCurrency(b.value, summary.currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
