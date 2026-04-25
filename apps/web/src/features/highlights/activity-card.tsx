"use client";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

const INCOMPLETE_ONBOARDING_COUNT: number = 3;

export function ActivityCard() {
  return (
    <HighlightsCard className="bg-provost-card-blue-dark p-[18px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-2">
          <HighlightsIcon className="text-provost-card-blue-light" />
          <span className="font-semibold text-[16px] text-provost-card-blue-light">Activity</span>
        </div>

        <p className="pr-10 font-serif text-[34px] text-provost-card-blue-light leading-[1.3] tracking-[-1.02px]">
          {INCOMPLETE_ONBOARDING_COUNT === 1
            ? "One family member has"
            : `${INCOMPLETE_ONBOARDING_COUNT === 2 ? "Two" : "Three"} family members have`}{" "}
          yet to complete Provost onboarding.
        </p>
      </div>
    </HighlightsCard>
  );
}
