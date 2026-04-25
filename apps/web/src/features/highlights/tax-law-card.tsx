"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function TaxLawCard() {
  return (
    <HighlightsCard className="bg-provost-card-tan p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-tan-dark" />
            <span className="font-semibold text-[16px] text-provost-card-tan-dark">Tax Law</span>
          </div>
          <p className="font-serif text-[18px] text-provost-card-tan-dark leading-[1.3] tracking-[-0.54px]">
            The lifetime estate and gift tax exemption was recently made &quot;permanent&quot;.
          </p>
        </div>

        <div className="flex items-center">
          <Image src="/images/tax-law-gazebo.png" alt="" width={101} height={82} />
        </div>
      </div>
    </HighlightsCard>
  );
}
