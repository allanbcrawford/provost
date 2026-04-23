# Staging Environment Setup

Staging is a long-lived environment that mirrors production, uses a separate Convex deployment and a Clerk **development** instance. It is distinct from Vercel Preview deployments (which are ephemeral, per-PR).

---

## Environment overview

| Tier | Vercel branch/alias | Convex deployment | Clerk instance |
|------|---------------------|-------------------|----------------|
| Production | `main` → `provost.app` | `provost-prod` | Production |
| Staging | `staging` → `staging.provost.app` | `provost-staging` | Development |
| Preview | any PR branch | ephemeral preview | Development |

---

## Step 1 — Create a staging branch in git

```bash
git checkout -b staging
git push origin staging
```

Keep `staging` as a long-lived branch. Changes flow: feature branch → PR to `main` → merge `main` → `staging` periodically (or merge PRs directly to `staging` for canary validation before `main`).

---

## Step 2 — Create the Convex staging deployment

1. Open the [Convex Dashboard](https://dashboard.convex.dev) → your project → **Deployments** tab.
2. Click **Create deployment**, name it `provost-staging`, select **Development** tier.
3. Copy the deployment URL (e.g. `https://...-staging.convex.cloud`).
4. Generate a deploy key: **Settings → Deploy Keys → Create → type: Production** (reuse the same key type so `npx convex deploy` works).

Set the required env vars on the staging deployment:

```bash
npx convex env set --url https://<staging-url>.convex.cloud CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
npx convex env set --url https://<staging-url>.convex.cloud OPENAI_API_KEY sk-...
npx convex env set --url https://<staging-url>.convex.cloud ALLOW_SEED true
npx convex env set --url https://<staging-url>.convex.cloud CLERK_SECRET_KEY sk_test_...
```

Deploy schema + functions to staging:

```bash
npx convex deploy --url https://<staging-url>.convex.cloud
npx convex run seed:run --url https://<staging-url>.convex.cloud
```

---

## Step 3 — Create a Clerk development instance (if not already done)

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → **Create application** → choose **Development**.
2. Enable Email/Password and Magic Link sign-in methods.
3. Note the **Frontend API** domain (e.g. `your-app.clerk.accounts.dev`) — this is `CLERK_JWT_ISSUER_DOMAIN`.
4. Note the **Secret Key** (`sk_test_...`) — this is `CLERK_SECRET_KEY` on both the staging Convex deployment and the Vercel staging environment.
5. Note the **Publishable Key** (`pk_test_...`) — this is `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` on Vercel.

---

## Step 4 — Configure Vercel for staging

In the **Vercel Dashboard** for the `provost` project:

1. Go to **Settings → Git → Production Branch** — leave this as `main`.
2. Go to **Settings → Domains** → add `staging.provost.app` (or your preferred subdomain).
   - In your DNS provider, create a `CNAME` record: `staging` → `cname.vercel-dns.com` (Vercel shows the exact target).
   - You (the project owner) must add the real domain — Vercel will issue a TLS certificate automatically.
3. Go to **Settings → Git → Preview Branches** → add `staging` as an additional branch that deploys to the **Production** environment type (so it gets a stable URL, not an ephemeral preview URL).
   - Alternatively, use **Vercel Environments**: create a `staging` environment under **Settings → Environments** and assign the `staging` branch to it.

Add staging-specific environment variables in **Settings → Environment Variables**, scoped to the `staging` environment (or the `staging` branch if using branch-based env overrides):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://<staging-url>.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (Clerk dev instance) |
| `CLERK_SECRET_KEY` | `sk_test_...` (Clerk dev instance) |

> DNS note: `staging.provost.app` is a placeholder. Replace with the real subdomain you own. Vercel will provision TLS once the CNAME propagates (usually < 5 minutes on Cloudflare, up to 48 h on other registrars).

---

## Step 5 — Wire up GitHub Actions (optional but recommended)

Add a staging deploy job to `.github/workflows/ci.yml` that triggers on push to `staging`:

```yaml
deploy-staging:
  if: github.ref == 'refs/heads/staging'
  needs: [test]
  runs-on: ubuntu-latest
  environment:
    name: staging
    url: https://staging.provost.app
  steps:
    - uses: actions/checkout@v4

    - name: Deploy Convex (staging)
      run: npx convex deploy --url ${{ secrets.CONVEX_STAGING_URL }}
      env:
        CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_STAGING_DEPLOY_KEY }}

    - name: Deploy Vercel (staging)
      run: pnpm dlx vercel --prod --env staging
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Required GitHub secrets for staging:

| Secret | Description |
|--------|-------------|
| `CONVEX_STAGING_URL` | `https://<staging-url>.convex.cloud` |
| `CONVEX_STAGING_DEPLOY_KEY` | Deploy key from Convex staging deployment |

---

## Rollback on staging

```bash
# Re-deploy a previous Convex function version (git sha)
git checkout <sha>
npx convex deploy --url https://<staging-url>.convex.cloud

# Roll back Vercel to a previous staging deployment
# vercel.com → provost → Deployments → pick previous → Promote to Production
```
