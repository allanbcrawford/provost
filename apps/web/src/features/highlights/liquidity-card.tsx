"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function LiquidityCard() {
  return (
    <HighlightsCard href="/assets?section=totalLiquidity" className="bg-provost-card-teal p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-navy" />
            <span className="text-provost-card-navy text-[16px] font-semibold">Liquidity</span>
          </div>
          <p className="text-provost-card-navy text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
            Williams total liquidity recently fell below the <span className="font-bold">35%</span>{" "}
            target set in May 2025
          </p>
        </div>

        <div className="flex items-center mr-1">
          <Image src="/images/liquidity-chart.png" alt="" width={86} height={85} />
        </div>
      </div>
    </HighlightsCard>
  );
}
