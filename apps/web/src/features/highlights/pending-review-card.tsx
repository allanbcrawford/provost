"use client";

import { useQuery } from "convex/react";
import { useAuthedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

// Advisor / family-admin tile: how many AI signals are waiting for review.
// Hidden when the count is zero so it doesn't take up a slot needlessly.
export function PendingReviewCard() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const count = useQuery(api.signals.countPendingReview, familyId ? { familyId } : "skip");
  const visible = typeof count === "number" && count > 0;
  if (!visible) return null;
  return (
    <HighlightsCard href="/signals/queue" className="bg-amber-50 p-[18px]">
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <HighlightsIcon className="text-amber-700" />
          <span className="font-semibold text-[16px] text-amber-900">Awaiting review</span>
        </div>
        <p className="text-[14px] text-amber-900">
          {count} signal{count === 1 ? "" : "s"} ready for advisor review.
        </p>
      </div>
    </HighlightsCard>
  );
}
