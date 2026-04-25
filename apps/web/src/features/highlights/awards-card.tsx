"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function AwardsCard() {
  return (
    <HighlightsCard className="bg-provost-card-slate p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-blue-light" />
            <span className="font-semibold text-[16px] text-provost-card-blue-light">Awards</span>
          </div>
          <p className="font-serif text-[18px] text-provost-card-blue-light leading-[1.3] tracking-[-0.54px]">
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
