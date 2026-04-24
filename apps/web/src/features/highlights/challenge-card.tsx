"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

export function ChallengeCard() {
  return (
    <HighlightsCard className="bg-provost-card-blue-dark p-[18px]">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-blue-light" />
            <span className="text-provost-card-blue-light text-[16px] font-semibold">
              Challenge
            </span>
          </div>

          <div className="flex -space-x-3">
            <div className="w-[41px] h-[41px] rounded-full border border-provost-card-blue-light overflow-hidden">
              <Image
                src="/images/challenge-avatar-1.png"
                alt=""
                width={41}
                height={41}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="w-[41px] h-[40px] rounded-full border border-provost-card-blue-light overflow-hidden">
              <Image
                src="/images/challenge-avatar-2.png"
                alt=""
                width={41}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="w-[41px] h-[41px] rounded-full border border-provost-card-blue-light overflow-hidden">
              <Image
                src="/images/challenge-avatar-3.png"
                alt=""
                width={41}
                height={41}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </div>

        <p className="text-provost-card-blue-light text-[34px] leading-[1.3] tracking-[-1.02px] font-serif mt-6 pr-4">
          Three family members have invited you to join a fun facts challenge.
        </p>
      </div>
    </HighlightsCard>
  );
}
