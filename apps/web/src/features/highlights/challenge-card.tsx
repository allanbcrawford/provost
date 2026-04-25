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
            <span className="font-semibold text-[16px] text-provost-card-blue-light">
              Challenge
            </span>
          </div>

          <div className="flex -space-x-3">
            <div className="h-[41px] w-[41px] overflow-hidden rounded-full border border-provost-card-blue-light">
              <Image
                src="/images/challenge-avatar-1.png"
                alt=""
                width={41}
                height={41}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="h-[40px] w-[41px] overflow-hidden rounded-full border border-provost-card-blue-light">
              <Image
                src="/images/challenge-avatar-2.png"
                alt=""
                width={41}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="h-[41px] w-[41px] overflow-hidden rounded-full border border-provost-card-blue-light">
              <Image
                src="/images/challenge-avatar-3.png"
                alt=""
                width={41}
                height={41}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <p className="mt-6 pr-4 font-serif text-[34px] text-provost-card-blue-light leading-[1.3] tracking-[-1.02px]">
          Three family members have invited you to join a fun facts challenge.
        </p>
      </div>
    </HighlightsCard>
  );
}
