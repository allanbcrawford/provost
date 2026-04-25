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
        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <HighlightsIcon className="text-provost-card-purple-light" />
            <span className="font-semibold text-[16px] text-provost-card-purple-light">Events</span>
          </div>
          <p className="font-serif text-[18px] text-provost-card-purple-light leading-[1.3] tracking-[-0.54px]">
            {CONTENT[variant]}
          </p>
        </div>

        <div className="mr-3 flex items-center">
          <Image src="/images/events-calendar.png" alt="" width={77} height={82} />
        </div>
      </div>
    </HighlightsCard>
  );
}
