"use client";

import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Category = "mutation" | "tool_call" | "run" | "auth" | "approval";
type ActorKind = "user" | "agent" | "system";

const CATEGORIES: (Category | "all")[] = [
  "all",
  "mutation",
  "tool_call",
  "run",
  "auth",
  "approval",
];

const ACTOR_KINDS: (ActorKind | "all")[] = ["all", "user", "agent", "system"];

const PAGE_SIZE = 50;

const RESOURCE_ROUTE: Record<string, (id: string) => string> = {
  document: (id) => `/documents/${id}`,
  lesson: (id) => `/lessons/${id}`,
  library_source: (id) => `/library/${id}`,
  "library-source": (id) => `/library/${id}`,
};

function formatRelative(ts: number): string {
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.round(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function resourceHref(resourceType?: string, resourceId?: string): string | null {
  if (!resourceType || !resourceId) return null;
  const builder = RESOURCE_ROUTE[resourceType];
  return builder ? builder(resourceId) : null;
}

export function AuditLog({ familyId }: { familyId: Id<"families"> }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [actorKind, setActorKind] = useState<ActorKind | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const queryArgs = useMemo(
    () => ({
      familyId,
      category: category === "all" ? undefined : category,
      actorKind: actorKind === "all" ? undefined : actorKind,
      search: searchDebounced.trim() || undefined,
      from: dateFrom ? new Date(dateFrom).getTime() : undefined,
      to: dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : undefined,
    }),
    [familyId, category, actorKind, searchDebounced, dateFrom, dateTo],
  );

  const { results, status, loadMore } = usePaginatedQuery(api.governance.auditEvents, queryArgs, {
    initialNumItems: PAGE_SIZE,
  });

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search action, resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-400"
          aria-label="From date"
        />
        <span className="text-provost-text-secondary text-xs">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-400"
          aria-label="To date"
        />
        {(dateFrom || dateTo || search) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setSearch("");
            }}
            className="text-provost-text-secondary text-xs underline hover:text-provost-text-primary"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-provost-text-secondary text-xs uppercase tracking-wide">
          Category
        </span>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                category === c
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-provost-text-secondary hover:border-neutral-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-provost-text-secondary text-xs uppercase tracking-wide">Actor</span>
        <div className="flex flex-wrap gap-1">
          {ACTOR_KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setActorKind(k)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                actorKind === k
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-provost-text-secondary hover:border-neutral-300"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</div>
      ) : results.length === 0 ? (
        <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          No audit events match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-provost-border-subtle bg-white">
          <table className="w-full text-[14px] tracking-[-0.42px]">
            <thead className="bg-neutral-50 text-left text-provost-text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Resource</th>
                <th className="px-4 py-2 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e) => {
                const href = resourceHref(e.resource_type, e.resource_id);
                const actorLabel = e.actor
                  ? e.actor.name
                  : e.actor_kind === "agent"
                    ? "Provost agent"
                    : e.actor_kind === "system"
                      ? "System"
                      : "User";
                const hasMetadata =
                  e.metadata &&
                  typeof e.metadata === "object" &&
                  Object.keys(e.metadata).length > 0;
                return (
                  <tr key={e._id} className="border-neutral-100 border-t align-top">
                    <td
                      className="whitespace-nowrap px-4 py-2 text-provost-text-secondary"
                      title={new Date(e._creationTime).toLocaleString()}
                    >
                      {formatRelative(e._creationTime)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-provost-text-primary text-xs">{actorLabel}</div>
                      <div className="text-[10px] text-provost-text-secondary uppercase">
                        {e.actor_kind}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                    <td className="px-4 py-2 text-xs">
                      {!e.resource_type ? (
                        <span className="text-provost-text-secondary">—</span>
                      ) : href ? (
                        <Link
                          href={href}
                          className="text-provost-text-primary underline decoration-dotted hover:decoration-solid"
                        >
                          {e.resource_type}:{e.resource_id}
                        </Link>
                      ) : (
                        <span className="text-provost-text-secondary">
                          {e.resource_type}
                          {e.resource_id ? `:${e.resource_id}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {hasMetadata ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-provost-text-secondary hover:text-provost-text-primary">
                            view
                          </summary>
                          <pre className="mt-1 max-w-md overflow-x-auto rounded bg-neutral-50 p-2 text-[11px] leading-relaxed">
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-provost-text-secondary text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canLoadMore || isLoadingMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={!canLoadMore}
            onClick={() => loadMore(PAGE_SIZE)}
            className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-provost-text-secondary hover:border-neutral-300 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
