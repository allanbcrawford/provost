<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

---

## Operational Stack

Provost is a Next.js application deployed on Vercel with a Convex backend.

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend + API routes | Vercel (Next.js 14, App Router) | `apps/web` |
| Backend DB + functions | Convex (`decisive-minnow-878`) | `convex/` |
| Authentication | Clerk | JWT-based, per-request in Convex mutations |
| AI reasoning | OpenAI (gpt-4o + embeddings) | Called from Convex actions |
| Observability | Sentry | Error tracking + source maps |

### Key Operational Documents

- **Operations Runbook** — incident response, common ops, on-call: [`docs/deploy/runbook.md`](docs/deploy/runbook.md)
- **Post-Launch Audit Checklist** — 9-item compliance sign-off: [`docs/deploy/post-launch-audit.md`](docs/deploy/post-launch-audit.md)
- **Environment Variables** — full env var reference: [`docs/deploy/env-vars.md`](docs/deploy/env-vars.md)
- **DNS Cutover Runbook** — production go-live steps: [`docs/deploy/cutover.md`](docs/deploy/cutover.md)
- **Decommission Guide** — legacy teardown: [`docs/deploy/decommission.md`](docs/deploy/decommission.md)

### Status Page

Public status page (no auth required): `/status`

Source: `apps/web/src/app/status/page.tsx`

Set `COMMIT_SHA` and `COMMIT_TIME` environment variables in Vercel to display deploy info on the status page.
