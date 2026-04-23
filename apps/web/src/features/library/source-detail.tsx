"use client";

import { Button, Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FACET_KEYS, FACET_LABELS, type LibrarySourceDetail, type TagEntry } from "./types";

function TagSection({ label, tags }: { label: string; tags: TagEntry[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="mb-1.5 font-semibold text-[11px] text-provost-text-secondary uppercase tracking-[0.5px]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className="inline-flex items-center rounded-full bg-provost-bg-secondary px-2.5 py-0.5 font-medium text-provost-text-secondary text-xs"
          >
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SourceDetail({ sourceId }: { sourceId: Id<"library_sources"> }) {
  const source = useQuery(api.library.getSource, { sourceId }) as
    | LibrarySourceDetail
    | null
    | undefined;

  if (source === undefined) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading…</div>;
  }
  if (source === null) {
    return (
      <div className="p-8 text-provost-text-secondary text-sm">
        Source not found.{" "}
        <Link href="/library" className="underline">
          Back to library
        </Link>
      </div>
    );
  }

  const author = source.author || "Unknown";

  return (
    <div className="flex min-h-full justify-center bg-white">
      <div className="w-full max-w-[794px] px-6 pt-8 pb-24">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/library">
              <Icon name="arrow_back" size={18} />
              Back
            </Link>
          </Button>
        </div>

        <h1 className="font-bold text-[36px] leading-[1.4] tracking-[-0.36px]">{source.title}</h1>
        <div className="mt-6 h-px bg-provost-border-default" />

        <div className="py-4">
          <p className="text-[13px] text-provost-text-secondary">
            {source.category}
            {"  ·  "}By {author}
          </p>

          <div className="mt-4">
            {FACET_KEYS.map((key) => (
              <TagSection key={key} label={FACET_LABELS[key]} tags={source.tags[key] ?? []} />
            ))}
          </div>
        </div>

        <div className="h-px bg-provost-border-default" />

        {source.content ? (
          <div className="mt-8 whitespace-pre-line text-[15px] text-provost-text-primary leading-[1.8]">
            {source.content}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center py-16 text-center">
            <Icon
              name="description"
              size={48}
              weight={200}
              className="mb-4 text-provost-text-secondary"
            />
            <p className="mb-2 font-medium text-[17px] text-provost-text-primary">
              Content unavailable
            </p>
            <p className="max-w-[320px] text-[14px] text-provost-text-secondary">
              The content of this source could not be extracted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
