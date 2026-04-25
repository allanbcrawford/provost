"use client";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

const PLACEHOLDER_TOTAL = 42800000;
const MONTHLY_CHANGE = 2.4;
const YTD_CHANGE = 8.7;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AssetsCard() {
  return (
    <HighlightsCard href="/assets?section=totalAssets" className="bg-provost-card-navy p-[18px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-2">
          <HighlightsIcon className="text-provost-card-navy-light" />
          <span className="font-semibold text-[16px] text-provost-card-navy-light">Assets</span>
        </div>

        <p className="flex-1 font-serif text-[23px] text-provost-card-navy-light leading-[1.3] tracking-[-0.69px]">
          Total assets increased {MONTHLY_CHANGE.toFixed(1)}% over the last month and are up{" "}
          {YTD_CHANGE.toFixed(1)}% year-to-date.
        </p>

        <p className="mt-4 text-right font-bold text-[50px] text-provost-card-navy-light">
          {formatCurrency(PLACEHOLDER_TOTAL)}
        </p>
      </div>
    </HighlightsCard>
  );
}
