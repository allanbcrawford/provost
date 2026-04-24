"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function LegacyCard() {
  return (
    <HighlightsCard href="/legacy" className="bg-provost-card-blue-light p-[18px]">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-blue-dark" />
            <span className="text-provost-card-blue-dark text-[16px] font-semibold">Legacy</span>
          </div>
          <p className="text-provost-card-blue-dark text-[23px] leading-[1.3] tracking-[-0.69px] font-serif pr-4">
            Jump back in to help us better understand your personal values and goals.
          </p>
        </div>

        <div className="flex justify-end">
          <Image src="/images/legacy-signature.png" alt="" width={140} height={130} />
        </div>
      </div>
    </HighlightsCard>
  );
}
