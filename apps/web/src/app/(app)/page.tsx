import {
  ActivityCard,
  AssetsCard,
  EventsCard,
  LessonsCard,
  LiquidityCard,
  MessagesCard,
  PendingReviewCard,
  TaxLawCard,
  YearReviewCard,
} from "@/features/highlights";

// Bento dashboard. Uses grid-auto-flow: dense so any tile we add later
// (e.g. PendingReviewCard, which only renders for advisors when there's
// something to review) backfills any gap left by a missing tile rather
// than leaving a hole in the layout.
export default function DashboardPage() {
  return (
    <div className="p-6">
      <div
        className="mx-auto grid max-w-[776px] grid-cols-1 gap-4 md:grid-cols-2 md:auto-rows-[137px]"
        style={{ gridAutoFlow: "dense" }}
      >
        <div className="md:row-span-2">
          <AssetsCard />
        </div>

        <div>
          <TaxLawCard />
        </div>

        <div>
          <LiquidityCard />
        </div>

        <div className="md:row-span-2">
          <YearReviewCard />
        </div>
        <div className="md:row-span-2">
          <ActivityCard />
        </div>

        <div className="md:row-span-2">
          <LessonsCard />
        </div>
        <div>
          <EventsCard />
        </div>
        <div>
          <MessagesCard />
        </div>

        {/* Renders only when there are signals waiting for review.
            grid-auto-flow: dense slots it into the first available gap. */}
        <PendingReviewCard />
      </div>
    </div>
  );
}
