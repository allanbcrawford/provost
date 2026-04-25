"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function LegacyCard() {
  return (
    <HighlightsCard href="/legacy" className="bg-provost-card-blue-light p-[18px]">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-blue-dark" />
            <span className="font-semibold text-[16px] text-provost-card-blue-dark">Legacy</span>
          </div>
          <p className="pr-4 font-serif text-[23px] text-provost-card-blue-dark leading-[1.3] tracking-[-0.69px]">
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
