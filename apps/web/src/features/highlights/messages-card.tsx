"use client";

import Image from "next/image";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

type MessagesCardProps = {
  variant?: "admin" | "member";
};

const CONTENT = {
  admin: "You have 5 unread messages from family members and an attorney.",
  member: "You have 3 unread messages from family members and Provost.",
};

export function MessagesCard({ variant = "admin" }: MessagesCardProps) {
  return (
    <HighlightsCard href="/messages" className="bg-provost-card-blue-accent p-[18px]">
      <div className="flex h-full gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-blue-light" />
            <span className="text-provost-card-blue-light text-[16px] font-semibold">Messages</span>
          </div>
          <p className="text-provost-card-blue-light text-[18px] leading-[1.3] tracking-[-0.54px] font-serif">
            {CONTENT[variant]}
          </p>
        </div>

        <div className="flex items-center mr-3">
          <Image src="/images/messages-bubble.png" alt="" width={80} height={86} />
        </div>
      </div>
    </HighlightsCard>
  );
}
