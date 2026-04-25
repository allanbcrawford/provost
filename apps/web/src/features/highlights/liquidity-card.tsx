"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function LiquidityCard() {
  return (
    <HighlightsCard href="/assets?section=totalLiquidity" className="bg-provost-card-teal p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-navy" />
            <span className="font-semibold text-[16px] text-provost-card-navy">Liquidity</span>
          </div>
          <p className="font-serif text-[18px] text-provost-card-navy leading-[1.3] tracking-[-0.54px]">
            Williams total liquidity recently fell below the <span className="font-bold">35%</span>{" "}
            target set in May 2025
          </p>
        </div>

        <div className="mr-1 flex items-center">
          <Image src="/images/liquidity-chart.png" alt="" width={86} height={85} />
        </div>
      </div>
    </HighlightsCard>
  );
}
