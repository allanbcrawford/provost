"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function TaxLawCard() {
  return (
    <HighlightsCard className="bg-provost-card-tan p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-tan-dark" />
            <span className="text-provost-card-tan-dark text-[16px] font-semibold">Tax Law</span>
          </div>
          <p className="text-provost-card-tan-dark text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
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
