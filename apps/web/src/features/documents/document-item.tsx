import { Button } from "@provost/ui";
import Image from "next/image";
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
  const thumbnailSrc = isFinancial
    ? "/images/documents/financial-document.png"
    : "/images/documents/documents.png";

  return (
    <div className="flex items-start gap-4">
      <div className="flex items-center justify-center">
        <Image
          src={thumbnailSrc}
          alt={document.name}
          width={95}
          height={95}
          className="h-[95px] w-[95px] object-cover"
          unoptimized
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-12">
            <div className="max-w-[400px] truncate text-[20px] font-bold tracking-[-0.8px]">
              {document.name}
            </div>
            {document.summary && (
              <p className="mt-1 line-clamp-1 max-w-[500px] text-[15px] font-normal tracking-[-0.4px] text-provost-text-secondary">
                {document.summary}
              </p>
            )}
          </div>

          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/documents/${document._id}`}>Open document</Link>
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-provost-text-secondary">
          {document.creator_name && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span className="ml-1">{document.creator_name}</span>
            </span>
          )}

          {document.creator_name && (
            <span
              aria-hidden
              className="mx-[5.7px] inline-block h-[3.5px] w-[3.5px] shrink-0 rounded-full bg-current opacity-60"
            />
          )}

          <span>{formatDate(document._creationTime)}</span>

          {document.observation_is_observed && (
            <span
              className={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-[14px] font-medium ${
                isDanger
                  ? "bg-provost-observation-danger text-white"
                  : "bg-provost-observation-info-bg text-provost-accent-blue"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">search_check_2</span>
              <span className="ml-1">Observation</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
