import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly: summarize active threads that have grown past the trim threshold
// so future runs send summary + tail instead of full history.
crons.cron(
  "nightly-thread-summary",
  "15 7 * * *", // 07:15 UTC daily
  internal.agent.summarize.nightlyThreadSummary,
);

// Weekly: queue a digest to each family admin with pending approvals,
// new signals, and open tasks. Delivery is stubbed until Phase 7.
crons.cron(
  "weekly-admin-digest",
  "0 14 * * 1", // Mondays 14:00 UTC
  internal.agent.digest.weeklyDigest,
);

// Monthly: capture an asset_snapshots row for every active asset so the
// trend chart on /assets has fresh time-series data even when assets are
// not edited.
crons.cron(
  "monthly-asset-snapshot",
  "0 0 1 * *", // 1st of month, 00:00 UTC
  internal.assetsInternal.captureMonthly,
);

export default crons;
