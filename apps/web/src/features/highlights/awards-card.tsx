"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function AwardsCard() {
  return (
    <HighlightsCard className="bg-provost-card-slate p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-blue-light" />
            <span className="text-provost-card-blue-light text-[16px] font-semibold">Awards</span>
          </div>
          <p className="text-provost-card-blue-light text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
            A new award is available for family members that complete lessons before Christmas.
          </p>
        </div>

        <div className="flex items-center">
          <Image
            src="/images/awards-badge.png"
            alt=""
            width={91}
            height={58}
            className="rounded-[10px]"
          />
        </div>
      </div>
    </HighlightsCard>
  );
}
