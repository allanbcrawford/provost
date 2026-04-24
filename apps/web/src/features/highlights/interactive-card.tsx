"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function InteractiveCard() {
  return (
    <HighlightsCard className="bg-provost-card-gray p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-[#eee]" />
            <span className="text-[#eee] text-[16px] font-semibold">Interactive</span>
          </div>
          <p className="text-[#eee] text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
            Provost created a new interactive learning experience that you may like.
          </p>
        </div>

        <div className="flex items-center">
          <Image src="/images/interactive-robot.png" alt="" width={95} height={92} />
        </div>
      </div>
    </HighlightsCard>
  );
}
