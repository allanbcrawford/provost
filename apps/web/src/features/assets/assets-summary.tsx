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
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (summary.count === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No assets yet.
      </div>
    );
  }
  return (
    <div className="rounded-[14px] border border-provost-border-subtle bg-white p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[12px] text-provost-text-secondary uppercase tracking-[1px]">
            Total
          </div>
          <div className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
            {formatCurrency(summary.total, summary.currency)}
          </div>
        </div>
        <div className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">
          {summary.count} asset{summary.count === 1 ? "" : "s"}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {summary.byType.map((b) => (
          <div key={b.type} className="rounded-[10px] bg-provost-bg-muted/50 p-4">
            <div className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
              {b.type}
            </div>
            <div className="mt-1 font-medium text-[18px] text-provost-text-primary tracking-[-0.54px]">
              {formatCurrency(b.value, summary.currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
