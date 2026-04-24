import {
  ActivityCard,
  AssetsCard,
  EventsCard,
  LessonsCard,
  LiquidityCard,
  MessagesCard,
  TaxLawCard,
  YearReviewCard,
} from "@/features/highlights";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[137px_137px_293px_137px_137px] gap-4 max-w-[776px] mx-auto">
        <div className="md:row-span-2 h-[293px] md:h-[290px]">
          <AssetsCard />
        </div>

        <div className="h-[137px]">
          <TaxLawCard />
        </div>

        <div className="h-[137px]">
          <LiquidityCard />
        </div>

        <div className="h-[293px]">
          <YearReviewCard />
        </div>
        <div className="h-[293px]">
          <ActivityCard />
        </div>

        <div className="md:row-span-2 h-[293px] md:h-[290px]">
          <LessonsCard />
        </div>
        <div className="h-[137px]">
          <EventsCard />
        </div>
        <div className="h-[137px]">
          <MessagesCard />
        </div>
      </div>
    </div>
  );
}
