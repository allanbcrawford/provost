"use client";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

const INCOMPLETE_ONBOARDING_COUNT: number = 3;

export function ActivityCard() {
  return (
    <HighlightsCard className="bg-provost-card-blue-dark p-[18px]">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <HighlightsIcon className="text-provost-card-blue-light" />
          <span className="text-provost-card-blue-light text-[16px] font-semibold">Activity</span>
        </div>

        <p className="text-provost-card-blue-light text-[34px] leading-[1.3] tracking-[-1.02px] font-serif pr-10">
          {INCOMPLETE_ONBOARDING_COUNT === 1
            ? "One family member has"
            : `${INCOMPLETE_ONBOARDING_COUNT === 2 ? "Two" : "Three"} family members have`}{" "}
          yet to complete Provost onboarding.
        </p>
      </div>
    </HighlightsCard>
  );
}
