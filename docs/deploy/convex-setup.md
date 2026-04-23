# Convex Deployment Setup

This guide covers deploying Convex for both preview (per-PR) and production environments.

---

## Production Deployment

### 1. Deploy to production

Run this once from the repo root to push your Convex schema, functions, and indexes to the production deployment:

```bash
npx convex deploy --prod
```

Or use the root workspace script:

```bash
pnpm deploy:convex:prod
```

### 2. Set required environment variables on production

Convex production deployments need the following environment variables. Set them via the CLI:

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
npx convex env set --prod OPENAI_API_KEY sk-...
```

Replace the values with your actual Clerk frontend API domain and OpenAI key.

### 3. Production NEVER seeds

`ALLOW_SEED` must not be set on production. The `seedIfEmpty` mutation in `convex/seed.ts` is gated on this variable and will no-op if it is absent or falsy. Do not set `ALLOW_SEED` on production Convex deployments.

---

## Preview Deployments (CI/CD)

Preview deployments are handled automatically by the `preview-deploy` job in `.github/workflows/ci.yml` on every pull request.

### What happens automatically

1. A Convex preview deployment is created using `CONVEX_PREVIEW_DEPLOY_KEY`.
2. `ALLOW_SEED=true` is set on the preview deployment via `npx convex env set`.
3. `npx convex run seed:run` seeds a synthetic family for testing.

### Required GitHub Secret

| Secret | Where to get it |
|--------|----------------|
| `CONVEX_PREVIEW_DEPLOY_KEY` | Convex Dashboard → Settings → Deploy Keys → Create a **Preview** key |

If this secret is absent, the Convex preview deploy steps are skipped with a warning and CI continues (Vercel preview still deploys).

---

## Dashboard Links

- Convex dashboard: https://dashboard.convex.dev
- Deploy keys: Dashboard → your project → Settings → Deploy Keys

---

## Common Commands

```bash
# Deploy to production
npx convex deploy --prod

# Deploy to a named preview
npx convex deploy --preview-name my-branch

# Set a production env var
npx convex env set --prod KEY value

# Run a function on production
npx convex run seed:run --prod

# Open the Convex dashboard for this project
npx convex dashboard
```
