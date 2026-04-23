"use client";

import { Button, Icon } from "@provost/ui";
import Link from "next/link";
import { useState } from "react";

import { FACET_KEYS, FACET_LABELS, type LibrarySourceSummary, type TagEntry } from "./types";

type Props = {
  source: LibrarySourceSummary;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  highlightedTags?: Set<string>;
};

function TagPill({ tag, highlighted }: { tag: TagEntry; highlighted: boolean }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-[10px] ${
        highlighted
          ? "bg-provost-bg-menu-hover text-provost-text-primary"
          : "bg-provost-bg-secondary text-provost-text-secondary"
      }`}
    >
      {tag.label}
    </span>
  );
}

export function SourceItem({
  source,
  isSelected,
  onToggleSelect,
  highlightedTags = new Set(),
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const author = source.author || "Unknown";

  const tagSections = FACET_KEYS.map((key) => ({
    label: FACET_LABELS[key],
    tags: source.tags[key] ?? [],
  })).filter((s) => s.tags.length > 0);

  const topTags = tagSections.flatMap((s) => s.tags).slice(0, 5);

  return (
    <div
      className={`group border-provost-border-default border-b ${isSelected ? "bg-provost-bg-card-subtle" : ""}`}
    >
      <div className="flex items-center py-3">
        <button
          type="button"
          aria-label={isSelected ? "Deselect source" : "Select source"}
          aria-pressed={isSelected}
          className="flex h-[37px] w-[37px] flex-shrink-0 cursor-pointer items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(source._id);
          }}
        >
          <div
            className={`hidden h-5 w-5 items-center justify-center rounded-sm border-2 group-hover:flex ${
              isSelected
                ? "!flex border-provost-text-primary bg-provost-text-primary"
                : "border-provost-neutral-300"
            }`}
          >
            {isSelected && <Icon name="check" size={14} className="text-white" />}
          </div>
          {!isSelected && (
            <Icon name="article" size={23} weight={300} className="group-hover:hidden" />
          )}
        </button>

        <button
          type="button"
          className="ml-3 flex-1 cursor-pointer text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className="font-semibold text-[15px] tracking-[-0.45px]">{source.title}</p>
          <p className="mt-0.5 font-medium text-[10px] text-provost-neutral-500 tracking-[0.1px]">
            {source.category}
            {"  ·  "}Created by {author}
          </p>
          {topTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {topTags.map((tag) => (
                <TagPill key={tag.label} tag={tag} highlighted={highlightedTags.has(tag.label)} />
              ))}
            </div>
          )}
        </button>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/library/${source._id}`}>View</Link>
          </Button>
          <Icon name="more_vert" size={24} className="cursor-pointer text-provost-text-secondary" />
        </div>
      </div>

      {isExpanded && tagSections.length > 0 && (
        <div className="pr-4 pb-3 pl-[52px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {tagSections.flatMap((section) =>
              section.tags.map((tag) => (
                <TagPill
                  key={`${section.label}-${tag.label}`}
                  tag={tag}
                  highlighted={highlightedTags.has(tag.label)}
                />
              )),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
