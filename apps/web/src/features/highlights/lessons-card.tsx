"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

type LessonsCardProps = {
  variant?: "admin" | "member";
};

const CONTENT = {
  admin: "You have 3 new lessons created by Provost that need your approval.",
  member: "You have 2 new lessons created by Provost and approved by your dad.",
};

export function LessonsCard({ variant = "admin" }: LessonsCardProps) {
  const href = variant === "admin" ? "/lessons?tab=curriculum" : "/lessons";

  return (
    <HighlightsCard href={href} className="bg-provost-card-green-light p-[18px]">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col pr-6">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-green-dark" />
            <span className="text-provost-card-green-dark text-[16px] font-semibold opacity-80">
              Lessons
            </span>
          </div>
          <p className="text-provost-card-green-dark text-[23px] leading-[1.3] tracking-[-0.69px] font-serif">
            {CONTENT[variant]}
          </p>
        </div>

        <div className="flex justify-end pb-0 pr-3">
          <Image src="/images/lessons-code.png" alt="" width={110} height={90} />
        </div>
      </div>
    </HighlightsCard>
  );
}
