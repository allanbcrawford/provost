import { Button } from "@provost/ui";
import Link from "next/link";
import type { Doc } from "../../../../../convex/_generated/dataModel";

type DocumentItemProps = {
  document: Doc<"documents">;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DocumentItem({ document }: DocumentItemProps) {
  const isFinancial =
    document.category === "financial_statements" || document.category === "financial";
  const isDanger = document.observation_type === "danger";

  return (
    <div className="flex items-start gap-4 py-6 border-b border-provost-border-default last:border-b-0">
      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-md bg-provost-neutral-100 text-2xl">
        {isFinancial ? "📊" : "📄"}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-6">
            <div className="truncate text-[18px] font-semibold tracking-tight text-provost-text-primary">
              {document.name}
            </div>
            {document.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-provost-text-secondary">
                {document.summary}
              </p>
            )}
          </div>

          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/documents/${document._id}`}>Open document</Link>
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-provost-text-secondary">
          {document.creator_name && <span>{document.creator_name}</span>}
          {document.creator_name && <span aria-hidden>·</span>}
          <span>{formatDate(document._creationTime)}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{document.type}</span>

          {document.observation_is_observed && (
            <span
              className={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isDanger ? "bg-red-600 text-white" : "bg-blue-100 text-blue-700"
              }`}
            >
              Observation
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
