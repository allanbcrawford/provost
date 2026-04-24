"use client";

import { Button, Icon, Input } from "@provost/ui";
import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { CollectionItem } from "./collection-item";
import { FacetFilter } from "./facet-filter";
import { GroupItem } from "./group-item";
import { type LibraryTab, LibraryTabs } from "./library-tabs";
import { SourceItem } from "./source-item";
import { SourceItemGrid } from "./source-item-grid";
import {
  FACET_KEYS,
  type FacetSelection,
  type LibraryCollectionSummary,
  type LibraryGroupSummary,
  type LibrarySourceSummary,
} from "./types";

function getMatchingTags(source: LibrarySourceSummary, query: string): Set<string> {
  const q = query.toLowerCase().trim();
  if (!q) return new Set();
  const matches = new Set<string>();
  for (const key of FACET_KEYS) {
    for (const tag of source.tags[key] ?? []) {
      if (tag.label.toLowerCase().includes(q)) matches.add(tag.label);
    }
  }
  return matches;
}

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<LibraryTab>("sources");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [facets, setFacets] = useState<FacetSelection>({});
  const [showFilters, setShowFilters] = useState(true);

  const sources = useQuery(api.library.listSourcesAsAdmin, {
    query: searchQuery,
    facets,
  }) as LibrarySourceSummary[] | undefined;
  const groups = useQuery(api.library.listGroupsAsAdmin, {}) as LibraryGroupSummary[] | undefined;
  const collections = useQuery(api.library.listCollectionsAsAdmin, {}) as
    | LibraryCollectionSummary[]
    | undefined;

  // Fetch unfiltered for facet sidebar counts
  const allSourcesForFacets = useQuery(api.library.listSourcesAsAdmin, {}) as
    | LibrarySourceSummary[]
    | undefined;

  const counts = useMemo(
    () => ({
      sources: sources?.length ?? 0,
      groups: groups?.length ?? 0,
      collections: collections?.length ?? 0,
    }),
    [sources, groups, collections],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ctaLabel =
    activeTab === "sources"
      ? "Add Source"
      : activeTab === "groups"
        ? "Create Group"
        : "Create Collection";

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Library
        </h1>
        <Button
          variant="outline"
          size="sm"
          className="h-[35px] rounded-full border-provost-text-primary px-5 text-[15px]"
        >
          <Icon name="add" size={18} />
          {ctaLabel}
        </Button>
      </div>

      <LibraryTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      <div className="mt-5 mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-provost-border-default bg-white px-4 py-2">
          <Icon name="search" size={20} weight={300} className="text-provost-text-secondary" />
          <Input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-6 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-provost-text-secondary"
            >
              <Icon name="close" size={18} weight={300} />
            </button>
          )}
        </div>

        {activeTab === "sources" && (
          <>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className="rounded-lg p-2 hover:bg-provost-bg-secondary"
              aria-label="Toggle view mode"
            >
              <Icon
                name={viewMode === "list" ? "grid_view" : "format_list_bulleted"}
                size={22}
                weight={300}
                className="text-provost-text-secondary"
              />
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="rounded-lg p-2 hover:bg-provost-bg-secondary"
              aria-label="Toggle filters"
            >
              <Icon
                name="filter_list"
                size={22}
                weight={300}
                className={
                  showFilters ? "text-provost-text-primary" : "text-provost-text-secondary"
                }
              />
            </button>
          </>
        )}
      </div>

      {selectedSources.size > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-xl bg-provost-bg-secondary px-4 py-3">
          <span className="font-medium text-[14px]">
            {selectedSources.size} source{selectedSources.size > 1 ? "s" : ""} selected
          </span>
          <Button variant="primary" size="sm">
            Create group
          </Button>
          <button
            type="button"
            onClick={() => setSelectedSources(new Set())}
            className="ml-auto text-[13px] text-provost-text-secondary hover:text-provost-text-primary"
          >
            Clear
          </button>
        </div>
      )}

      {activeTab === "sources" && (
        <div className="flex gap-6">
          {showFilters && allSourcesForFacets && (
            <FacetFilter sources={allSourcesForFacets} selection={facets} onChange={setFacets} />
          )}

          <div className="min-w-0 flex-1">
            {sources === undefined ? (
              <p className="py-12 text-provost-text-secondary text-sm">Loading sources…</p>
            ) : viewMode === "list" ? (
              <div>
                {sources.map((doc) => (
                  <SourceItem
                    key={doc._id}
                    source={doc}
                    isSelected={selectedSources.has(doc._id)}
                    onToggleSelect={toggleSelect}
                    highlightedTags={getMatchingTags(doc, searchQuery)}
                  />
                ))}
                {sources.length === 0 && (
                  <p className="py-12 text-center text-[15px] text-provost-text-secondary">
                    No sources found.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {sources.map((doc) => (
                  <SourceItemGrid key={doc._id} source={doc} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "groups" && (
        <div>
          {groups && groups.length > 0 ? (
            groups.map((group) => <GroupItem key={group._id} group={group} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon
                name="folder"
                size={48}
                weight={200}
                className="mb-4 text-provost-neutral-300"
              />
              <p className="mb-2 font-medium text-[17px] text-provost-text-primary">
                No groups yet
              </p>
              <p className="max-w-[320px] text-[14px] text-provost-text-secondary">
                Select multiple sources and create a group to organize your library.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "collections" && (
        <div>
          {collections && collections.length > 0 ? (
            collections.map((col) => <CollectionItem key={col._id} collection={col} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon
                name="folder_copy"
                size={48}
                weight={200}
                className="mb-4 text-provost-neutral-300"
              />
              <p className="mb-2 font-medium text-[17px] text-provost-text-primary">
                No collections yet
              </p>
              <p className="max-w-[320px] text-[14px] text-provost-text-secondary">
                Collections let you organize groups of sources together.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
