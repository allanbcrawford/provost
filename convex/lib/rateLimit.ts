import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

type LimitConfig = { windowMs: number; max: number };

const LIMITS: Record<string, LimitConfig> = {
  "run.start:user": { windowMs: 60_000, max: 20 },
  "run.start:family": { windowMs: 60_000, max: 60 },
  "tool.create_task:family": { windowMs: 3_600_000, max: 50 },
  "tool.invite_member:family": { windowMs: 3_600_000, max: 10 },
  "tool.draft_revision:family": { windowMs: 3_600_000, max: 30 },
};

export async function checkAndIncrement(
  ctx: MutationCtx,
  bucketKey: string,
  scopeId: string,
): Promise<void> {
  const cfg = LIMITS[bucketKey];
  if (!cfg) return;
  const key = `${bucketKey}:${scopeId}`;
  const now = Date.now();
  const existing = await ctx.db
    .query("rate_limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing && now - existing.window_start < cfg.windowMs) {
    if (existing.count >= cfg.max) {
      throw new ConvexError({
        code: "RATE_LIMIT",
        bucket: bucketKey,
        max: cfg.max,
        windowMs: cfg.windowMs,
        retryAfterMs: cfg.windowMs - (now - existing.window_start),
      });
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return;
  }
  if (existing) {
    await ctx.db.patch(existing._id, { window_start: now, count: 1 });
  } else {
    await ctx.db.insert("rate_limits", { key, window_start: now, count: 1 });
  }
}
