# Performance Budgets

_Implemented in Phase 7.3 of the beta-parity plan._

## Thresholds

| Metric | Target | Source |
|--------|--------|--------|
| Page load (Lighthouse performance score) | ≥ 85 | PRD §9 |
| Accessibility score | ≥ 90 | PRD §9 |
| Chat time-to-first-token (p50) | < 3 000 ms | PRD §9 |
| Chat time-to-first-token (p95) | < 3 000 ms | PRD §9 |

## Enforcement: Lighthouse CI

Thresholds are enforced on every pull request targeting `main` via:

- **Workflow:** `.github/workflows/lighthouse.yml`
- **Config:** `apps/web/lighthouserc.json`
- **Action:** `treosh/lighthouse-ci-action@v12`

Tested routes: `/` (root/redirect) and `/sign-in`.

> **Note:** Authenticated routes (e.g. the bento home at `/home`) are NOT covered
> by V1 Lighthouse CI because the runner has no Clerk session. Add
> authenticated route coverage when a CI-compatible Clerk testing key is
> provisioned.

The PR check **fails hard** (`error` assertion level) if either score drops
below threshold. There is no "warning" mode.

## Manual Override

If a PR legitimately needs to ship below threshold (e.g. a design sprint with
a known perf regression that will be fixed in the next PR):

1. Open the PR description with a `## Perf exception` section explaining why.
2. Add the `perf-exception` label to the PR.
3. A repo admin merges with the Lighthouse check bypassed via
   `gh pr merge --admin <pr-number>`.
4. Create a follow-up issue tagged `perf` before merging.

Do **not** disable the workflow or lower the thresholds in `lighthouserc.json`
to unblock a single PR — use the admin bypass above instead.

## Chat TTFT Instrumentation

- **Field:** `thread_runs.ttft_ms` (`v.optional(v.number())`) — milliseconds
  from `Date.now()` recorded just before the first OpenAI streaming call until
  the first `content_delta` event is emitted.
- **Schema location:** `convex/schema_parts/chat.ts`
- **Written by:** `convex/agent/runInternal.ts` → `recordTtft` internal mutation,
  called from `convex/agent/runActions.ts` inside the streaming loop.
- **Query:** `convex/status.ts` → `recentChatTtftStats({ withinMinutes? })` —
  returns `{ p50: number | null, p95: number | null, sampleSize: number }`.

### How to query TTFT stats

From any Convex client or dashboard:

```ts
const stats = await convex.query(api.status.recentChatTtftStats, {
  withinMinutes: 60,
});
// { p50: 1240, p95: 2890, sampleSize: 47 }
```

The query is public (no auth required) to match the unauthenticated `/status`
page. If this becomes a concern, wrap with a role check.

## Vercel Speed Insights

`@vercel/speed-insights` is mounted in `apps/web/src/app/layout.tsx` (root
layout). It is a no-op outside Vercel deployments. Real-user performance data
is visible in the Vercel dashboard under the project's Speed Insights tab.
