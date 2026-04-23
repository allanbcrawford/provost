import type { Id } from "../../../../../convex/_generated/dataModel";

export type TagEntry = { label: string; confidence?: number };

export type DocumentTags = {
  domain?: TagEntry[];
  artifact_type?: TagEntry[];
  complexity?: TagEntry[];
  functional_use?: TagEntry[];
  risk?: TagEntry[];
};

export const FACET_KEYS = [
  "domain",
  "artifact_type",
  "complexity",
  "functional_use",
  "risk",
] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

export const FACET_LABELS: Record<FacetKey, string> = {
  domain: "Domain",
  artifact_type: "Type",
  complexity: "Complexity",
  functional_use: "Use",
  risk: "Risk",
};

export type LibrarySourceSummary = {
  _id: Id<"library_sources">;
  title: string;
  author: string | null;
  category: string;
  tags: DocumentTags;
};

export type LibrarySourceDetail = LibrarySourceSummary & {
  content: string;
};

export type LibraryGroupSummary = {
  _id: Id<"library_groups">;
  title: string;
  source_count: number;
};

export type LibraryCollectionSummary = {
  _id: Id<"library_collections">;
  title: string;
  group_count: number;
};

export type FacetSelection = Partial<Record<FacetKey, string[]>>;
