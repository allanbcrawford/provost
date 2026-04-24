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
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <HighlightsIcon className="text-provost-card-navy-light" />
          <span className="text-provost-card-navy-light text-[16px] font-semibold">Assets</span>
        </div>

        <p className="text-provost-card-navy-light text-[23px] leading-[1.3] tracking-[-0.69px] font-serif flex-1">
          Total assets increased {MONTHLY_CHANGE.toFixed(1)}% over the last month and are up{" "}
          {YTD_CHANGE.toFixed(1)}% year-to-date.
        </p>

        <p className="text-provost-card-navy-light text-[50px] font-bold mt-4 text-right">
          {formatCurrency(PLACEHOLDER_TOTAL)}
        </p>
      </div>
    </HighlightsCard>
  );
}
