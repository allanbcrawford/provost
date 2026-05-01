// Cron-driven monthly asset snapshot capture. Iterates every asset row
// across all families and writes a snapshot for today's UTC midnight.
// Idempotent — same-day reruns patch the existing snapshot.

import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

function todayMidnightUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

async function snapshotAsset(ctx: MutationCtx, asset: Doc<"assets">) {
  const snapshot_date = todayMidnightUtcMs();
  const existing = await ctx.db
    .query("asset_snapshots")
    .withIndex("by_asset_and_date", (q) =>
      q.eq("asset_id", asset._id).eq("snapshot_date", snapshot_date),
    )
    .unique();
  const payload = {
    family_id: asset.family_id,
    asset_id: asset._id,
    snapshot_date,
    value: asset.value,
    currency: asset.currency,
    captured_by: "cron" as const,
  };
  if (existing) await ctx.db.patch(existing._id, payload);
  else await ctx.db.insert("asset_snapshots", payload);
}

export const captureMonthly = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Emit a cron-health audit row so /status can surface last-run info.
    // Pattern: action="cron.<name>.<status>", category="run". Other crons
    // in convex/crons.ts (nightly-thread-summary, weekly-admin-digest)
    // should adopt the same call (see convex/status.ts:recordCronRun).
    const startedAt = Date.now();
    try {
      const assets = await ctx.db.query("assets").collect();
      for (const asset of assets) {
        await snapshotAsset(ctx, asset);
      }
      await ctx.db.insert("audit_events", {
        actor_kind: "system",
        category: "run",
        action: "cron.monthly-asset-snapshot.ok",
        metadata: {
          cron_name: "monthly-asset-snapshot",
          cron_status: "ok",
          duration_ms: Date.now() - startedAt,
          snapshotted: assets.length,
        },
      });
      return { snapshotted: assets.length };
    } catch (err) {
      await ctx.db.insert("audit_events", {
        actor_kind: "system",
        category: "run",
        action: "cron.monthly-asset-snapshot.error",
        metadata: {
          cron_name: "monthly-asset-snapshot",
          cron_status: "error",
          duration_ms: Date.now() - startedAt,
        },
      });
      throw err;
    }
  },
});
