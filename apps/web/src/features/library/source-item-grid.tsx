"use client";

import { Button, Icon } from "@provost/ui";
import Link from "next/link";
import type { LibrarySourceSummary } from "./types";

type Props = {
  source: LibrarySourceSummary;
};

export function SourceItemGrid({ source }: Props) {
  const author = source.author || "Unknown";
  const domainLabels = (source.tags.domain ?? []).map((t) => t.label).join(", ");
  const description = source.category + (domainLabels ? ` — ${domainLabels}` : "");
  const truncated = description.length > 100 ? `${description.slice(0, 100)}…` : description;

  return (
    <div className="overflow-hidden rounded-xl border border-provost-border-default transition-shadow hover:shadow-md">
      <div className="flex h-[180px] items-center justify-center bg-provost-bg-secondary">
        <Icon name="description" size={48} weight={200} className="text-provost-neutral-300" />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold text-[14px] tracking-[-0.28px]">
          {source.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12px] text-provost-text-secondary">{truncated}</p>
        <p className="mt-2 text-[10px] text-provost-neutral-500">Created by {author}</p>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/library/${source._id}`}>View</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
