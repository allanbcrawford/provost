// Phase 7.3: Public Convex queries for the /status page.
// The /status route is unauthenticated (no auth required per status/page.tsx),
// so these queries are registered as public and perform no auth check —
// consistent with the existing page's design intent.

import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";

// Returns p50 / p95 TTFT (time-to-first-token) statistics computed from
// thread_runs rows that finished within the last `withinMinutes` minutes and
// have a non-null ttft_ms value. Uses the by_family index is not useful here;
// we scan by_user is also not ideal — we use the by_thread index indirectly
// via a bounded take on the full table ordered by _creationTime descending.
// For V1 volumes this is acceptable; add a dedicated index if needed at scale.
export const recentChatTtftStats = query({
  args: {
    withinMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowMs = (args.withinMinutes ?? 60) * 60 * 1000;
    const cutoff = Date.now() - windowMs;

    // Take the most recent 500 completed runs and filter to the time window.
    // 500 is a safe upper bound for a 60-minute window in early beta.
    const rows = await ctx.db
      .query("thread_runs")
      .order("desc")
      .take(500);

    const samples: number[] = [];
    for (const row of rows) {
      // Stop scanning once we're past the time window.
      if (row._creationTime < cutoff) break;
      if (
        row.status === "completed" &&
        row.ttft_ms !== undefined &&
        row.ttft_ms !== null
      ) {
        samples.push(row.ttft_ms);
      }
    }

    if (samples.length === 0) {
      return { p50: null, p95: null, sampleSize: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? null;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? null;

    return { p50, p95, sampleSize: samples.length };
  },
});

// ---------------------------------------------------------------------------
// Phase 7.4: cron health + OpenAI ping (additive — do not collapse with 7.3).
// ---------------------------------------------------------------------------

const CRON_ACTION_PREFIX = "cron.";

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

