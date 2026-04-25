import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireFamilyMember, requireSiteAdmin } from "./lib/authz";

type TagEntry = { label: string; confidence?: number };

type DocumentTags = {
  domain?: TagEntry[];
  artifact_type?: TagEntry[];
  complexity?: TagEntry[];
  functional_use?: TagEntry[];
  risk?: TagEntry[];
};

const FACET_KEYS = ["domain", "artifact_type", "complexity", "functional_use", "risk"] as const;
type FacetKey = (typeof FACET_KEYS)[number];

const facetsValidator = v.optional(
  v.object({
    domain: v.optional(v.array(v.string())),
    artifact_type: v.optional(v.array(v.string())),
    complexity: v.optional(v.array(v.string())),
    functional_use: v.optional(v.array(v.string())),
    risk: v.optional(v.array(v.string())),
  }),
);

function tagLabels(source: Doc<"library_sources">, key: FacetKey): string[] {
  const tags = (source.tags as DocumentTags | undefined) ?? {};
  const entries = tags[key] ?? [];
  return entries.map((t) => t.label);
}

function matchesFacets(
  source: Doc<"library_sources">,
  facets: Partial<Record<FacetKey, string[]>> | undefined,
): boolean {
  if (!facets) return true;
  for (const key of FACET_KEYS) {
    const required = facets[key];
    if (!required || required.length === 0) continue;
    const have = new Set(tagLabels(source, key));
    for (const label of required) {
      if (!have.has(label)) return false;
    }
  }
  return true;
}

function matchesQuery(source: Doc<"library_sources">, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (source.title.toLowerCase().includes(q)) return true;
  if (source.category.toLowerCase().includes(q)) return true;
  if (source.author?.toLowerCase().includes(q)) return true;
  for (const key of FACET_KEYS) {
    for (const label of tagLabels(source, key)) {
      if (label.toLowerCase().includes(q)) return true;
    }
  }
  return false;
}

// Family-facing library list. Returns ONLY family-scoped sources for the
// caller's family. Global library_sources (family_id = null) are
// site-admin-only authoring scaffolding for lesson generation — family users
// must NEVER see them. The `by_family` index lookup with an exact eq() on
// familyId structurally excludes null-family rows; do not change to an
// `.or(null)` without revisiting that policy.
export const listSources = query({
  args: {
    familyId: v.id("families"),
    query: v.optional(v.string()),
    facets: facetsValidator,
  },
  handler: async (ctx, { familyId, query: q, facets }) => {
    await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("library_sources")
      .withIndex("by_family", (idx) => idx.eq("family_id", familyId))
      .take(1000);

    const filtered = rows
      .filter((r) => matchesFacets(r, facets))
      .filter((r) => matchesQuery(r, q ?? ""));

    return filtered.map((r) => ({
      _id: r._id,
      title: r.title,
      author: r.author ?? null,
      category: r.category,
      tags: (r.tags as DocumentTags | undefined) ?? {},
    }));
  },
});

// Family-facing single-source read. Family-scoped rows require family
// membership; global rows (family_id = null) are site-admin-only — see
// `getSourceAsAdmin` below for that surface. We refuse to return globals
// here even to authed users.
export const getSource = query({
  args: { sourceId: v.id("library_sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) return null;
    if (!source.family_id) {
      // Global source — only the site-admin curation surface can read this.
      return null;
    }
    await requireFamilyMember(ctx, source.family_id);
    return {
      _id: source._id,
      title: source.title,
      author: source.author ?? null,
      category: source.category,
      content: source.content,
      tags: (source.tags as DocumentTags | undefined) ?? {},
    };
  },
});

export const listGroups = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const groups = await ctx.db
      .query("library_groups")
      .withIndex("by_family", (idx) => idx.eq("family_id", familyId))
      .take(200);
    return groups.map((g) => ({
      _id: g._id,
      title: g.title,
      source_count: g.source_ids.length,
    }));
  },
});

export const listCollections = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const collections = await ctx.db
      .query("library_collections")
      .withIndex("by_family", (idx) => idx.eq("family_id", familyId))
      .take(200);
    return collections.map((c) => ({
      _id: c._id,
      title: c.title,
      group_count: c.group_ids.length,
    }));
  },
});

export type LibrarySourceSummary = {
  _id: Id<"library_sources">;
  title: string;
  author: string | null;
  category: string;
  tags: DocumentTags;
};

// ---------------------------------------------------------------------------
// Site-admin curation views. Not family-scoped — these read the global
// `library_sources` / `library_groups` / `library_collections` tables used to
// author knowledge content (learning modules, lessons, podcasts, etc.). Gated
// by `requireSiteAdmin` so family users can never hit them.
// ---------------------------------------------------------------------------

export const listSourcesAsAdmin = query({
  args: {
    query: v.optional(v.string()),
    facets: facetsValidator,
  },
  handler: async (ctx, { query: q, facets }) => {
    await requireSiteAdmin(ctx);
    const rows = await ctx.db.query("library_sources").take(1000);
    const filtered = rows
      .filter((r) => matchesFacets(r, facets))
      .filter((r) => matchesQuery(r, q ?? ""));
    return filtered.map((r) => ({
      _id: r._id,
      title: r.title,
      author: r.author ?? null,
      category: r.category,
      tags: (r.tags as DocumentTags | undefined) ?? {},
    }));
  },
});

export const getSourceAsAdmin = query({
  args: { sourceId: v.id("library_sources") },
  handler: async (ctx, { sourceId }) => {
    await requireSiteAdmin(ctx);
    const source = await ctx.db.get(sourceId);
    if (!source) return null;
    return {
      _id: source._id,
      title: source.title,
      author: source.author ?? null,
      category: source.category,
      content: source.content,
      tags: (source.tags as DocumentTags | undefined) ?? {},
    };
  },
});

export const listGroupsAsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireSiteAdmin(ctx);
    const groups = await ctx.db.query("library_groups").take(500);
    return groups.map((g) => ({
      _id: g._id,
      title: g.title,
      source_count: g.source_ids.length,
    }));
  },
});

export const listCollectionsAsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireSiteAdmin(ctx);
    const collections = await ctx.db.query("library_collections").take(500);
    return collections.map((c) => ({
      _id: c._id,
      title: c.title,
      group_count: c.group_ids.length,
    }));
  },
});
