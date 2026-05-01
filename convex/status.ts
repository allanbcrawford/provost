// Public, unauthenticated Convex functions backing the /status page.
// All queries/actions here are intentionally public — /status itself does not
// require auth — so they must never return secrets or family-scoped data.

import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";

const CRON_ACTION_PREFIX = "cron.";

// ---------------------------------------------------------------------------
// Chat TTFT (Phase 7.3)
// ---------------------------------------------------------------------------

// Returns p50/p95 time-to-first-token across recent completed thread_runs.
// Scans the most recent 500 rows and stops once we cross the time window —
// acceptable for V1 volumes. Add a dedicated index if scale demands it.
export const recentChatTtftStats = query({
  args: {
    withinMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.withinMinutes ?? 60) * 60 * 1000;
    const rows = await ctx.db.query("thread_runs").order("desc").take(500);

    const samples: number[] = [];
    for (const row of rows) {
      if (row._creationTime < cutoff) break;
      if (row.status === "completed" && row.ttft_ms != null) {
        samples.push(row.ttft_ms);
      }
    }

    if (samples.length === 0) {
      return { p50: null, p95: null, sampleSize: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] ?? null,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? null,
      sampleSize: samples.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Cron health + OpenAI ping (Phase 7.4)
// ---------------------------------------------------------------------------

// Names registered in convex/crons.ts. Listed manually so the status page
// can show crons that have never run yet (lastRunAt: null).
const REGISTERED_CRONS = [
  "nightly-thread-summary",
  "weekly-admin-digest",
  "monthly-asset-snapshot",
] as const;

export type CronStatus = "ok" | "error" | "unknown";

/**
 * Record a cron run. Called from each cron handler after a run finishes.
 * Reuses the existing `run` audit category so we don't have to widen the
 * schema enum just for one literal. Action format: `cron.<name>.<status>`.
 */
export const recordCronRun = internalMutation({
  args: {
    name: v.string(),
    status: v.union(v.literal("ok"), v.literal("error")),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { name, status, durationMs, error }) => {
    await ctx.db.insert("audit_events", {
      actor_kind: "system",
      category: "run",
      action: `${CRON_ACTION_PREFIX}${name}.${status}`,
      metadata: {
        cron_name: name,
        cron_status: status,
        ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
        ...(error ? { error } : {}),
      },
    });
  },
});

/**
 * Public query — returns last-known run per registered cron. No auth.
 * Filters audit_events to category=run and groups by `cron.<name>` prefix.
 * Acceptable scan cost while audit_events is small; add an action-prefix
 * index when the table grows past ~100k rows.
 */
export const cronHealth = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    Array<{
      name: string;
      lastRunAt: number | null;
      status: CronStatus;
      durationMs: number | null;
    }>
  > => {
    const latest = new Map<
      string,
      { at: number; status: CronStatus; durationMs: number | null }
    >();

    const events = await ctx.db
      .query("audit_events")
      .filter((q) => q.eq(q.field("category"), "run"))
      .collect();

    for (const ev of events) {
      if (!ev.action.startsWith(CRON_ACTION_PREFIX)) continue;
      const rest = ev.action.slice(CRON_ACTION_PREFIX.length);
      const dot = rest.lastIndexOf(".");
      if (dot < 0) continue;
      const name = rest.slice(0, dot);
      const tail = rest.slice(dot + 1);
      const status: CronStatus =
        tail === "ok" || tail === "error" ? tail : "unknown";

      const prev = latest.get(name);
      if (!prev || ev._creationTime > prev.at) {
        const md = (ev.metadata ?? {}) as { duration_ms?: number };
        latest.set(name, {
          at: ev._creationTime,
          status,
          durationMs: typeof md.duration_ms === "number" ? md.duration_ms : null,
        });
      }
    }

    return REGISTERED_CRONS.map((name) => {
      const seen = latest.get(name);
      return {
        name,
        lastRunAt: seen?.at ?? null,
        status: seen?.status ?? "unknown",
        durationMs: seen?.durationMs ?? null,
      };
    });
  },
});

/**
 * Cheap OpenAI reachability ping. 3-second timeout. Public — no auth.
 * Never returns the API key or raw error text; coarse shape only so the
 * unauthenticated /status page can't leak secrets.
 */
export const openaiPing = action({
  args: {},
  handler: async (): Promise<{
    status: "ok" | "error" | "unknown";
    latencyMs: number;
  }> => {
    const startedAt = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { status: "unknown", latencyMs: 0 };
    }
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
      return {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return { status: "error", latencyMs: Date.now() - startedAt };
    }
  },
});

