# Vercel Project Setup

This walkthrough connects the `provost` monorepo to a Vercel project. Run each step manually in your terminal.

## Prerequisites

- Node.js >= 22 and pnpm 9.15.0 installed
- Vercel account at vercel.com
- Vercel CLI available via `pnpm dlx vercel` (no global install required)

---

## Step 1 — Link the repo to a Vercel project

Run from the monorepo root (`/path/to/provost`):

```bash
pnpm dlx vercel link
```

When prompted:

| Prompt | Answer |
|--------|--------|
| Set up and deploy? | `N` (link only — CI will deploy) |
| Which scope? | Select your personal/team account |
| Link to existing project? | `N` if first time, `Y` to reuse |
| Project name | `provost` |
| In which directory is your code located? | `apps/web` |

Vercel writes `.vercel/project.json` at the repo root. **Commit this file** so CI can reference `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID`.

---

## Step 2 — Configure build settings in Vercel Dashboard

After linking, open **vercel.com → Projects → provost → Settings → General**.

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | *(leave blank — read from `vercel.json` at root)* |
| Output Directory | `.next` |
| Install Command | *(leave blank — read from `vercel.json` at root)* |
| Node.js Version | 22.x |

> The `vercel.json` at the repo root overrides these defaults for monorepo correctness.

---

## Step 3 — Add environment variables

See `docs/deploy/env-vars.md` for the full list.

In the Vercel Dashboard: **Settings → Environment Variables**.

Add each variable with the correct environment scope (Production / Preview / Development).

Or use the CLI in bulk:

```bash
# Example for a single variable
pnpm dlx vercel env add CLERK_SECRET_KEY production
# Paste the value when prompted
```

---

## Step 4 — Add Vercel tokens to GitHub Actions (if using CI)

1. In your Vercel account: **Settings → Tokens → Create Token** — name it `GITHUB_CI`.
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**:
   - `VERCEL_TOKEN` — the token from step 1
   - `VERCEL_ORG_ID` — from `.vercel/project.json` (`orgId` field)
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json` (`projectId` field)

---

## Step 5 — Verify a preview deployment

```bash
# From monorepo root — triggers a preview (non-production) deployment
pnpm --filter @provost/web build   # local sanity check first
bash scripts/deploy-preview.sh     # then deploy preview
```

Vercel will print a preview URL. Confirm the app loads and auth works end-to-end before promoting to production.

---

## Step 6 — Promote to Production

Either merge to your production branch (e.g. `main`) and let CI promote, or run:

```bash
pnpm dlx vercel --prod
```

---

## Rollback

To roll back a production deployment, open **vercel.com → provost → Deployments**, select the previous successful deployment, and click **Promote to Production**.

Or via CLI:

```bash
pnpm dlx vercel rollback
```
