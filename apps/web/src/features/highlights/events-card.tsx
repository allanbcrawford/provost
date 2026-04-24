"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

type EventsCardProps = {
  variant?: "admin" | "member";
};

const CONTENT = {
  admin: "You have 4 upcoming events with family members and an advisor.",
  member: "You have 2 upcoming events with family members.",
};

export function EventsCard({ variant = "admin" }: EventsCardProps) {
  return (
    <HighlightsCard href="/events" className="bg-provost-card-purple p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-purple-light" />
            <span className="text-provost-card-purple-light text-[16px] font-semibold">Events</span>
          </div>
          <p className="text-provost-card-purple-light text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
            {CONTENT[variant]}
          </p>
        </div>

        <div className="flex items-center mr-3">
          <Image src="/images/events-calendar.png" alt="" width={77} height={82} />
        </div>
      </div>
    </HighlightsCard>
  );
}
