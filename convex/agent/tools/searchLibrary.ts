import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

type LibrarySource = {
  _id: Doc<"library_sources">["_id"];
  title: string;
  author: string | null;
  category: string;
  tags: Record<string, unknown>;
};

function buildSnippet(row: LibrarySource): string {
  const parts: string[] = [];
  if (row.author) parts.push(`by ${row.author}`);
  const tagSummary = Object.entries(row.tags)
    .filter(([, v]) => Array.isArray(v) && (v as unknown[]).length > 0)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${(v as unknown[]).slice(0, 2).join(", ")}`)
    .join(" · ");
  if (tagSummary) parts.push(tagSummary);
  return parts.join(" — ");
}

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (ctx, { args, runId }) => {
    const query = typeof args?.query === "string" ? args.query : "";
    const facets = args?.facets && typeof args.facets === "object" ? args.facets : undefined;

    const { run } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, {
      runId,
    });

    const rows = (await ctx.runQuery(api.library.listSources, {
      familyId: run.family_id,
      query,
      facets,
    })) as LibrarySource[];

    const results = rows.slice(0, 10).map((r) => ({
      sourceId: r._id,
      title: r.title,
      category: r.category,
      snippet: buildSnippet(r),
    }));

    return {
      success: true,
      widget: {
        kind: "library-results",
        props: { query, facets, results },
      },
    };
  },
});
