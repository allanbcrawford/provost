# Environment Variables

All variables below must be configured in the Vercel Dashboard under **Settings → Environment Variables** for the `provost` project.

Scopes: **Production** (P), **Preview** (V), **Development** (D).

---

## Clerk (Authentication)

| Variable | P | V | D | Notes |
|----------|---|---|---|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Y | Y | Y | Publishable key from Clerk dashboard (safe for client) |
| `CLERK_SECRET_KEY` | Y | Y | Y | Secret key — never expose to client |
| `CLERK_JWT_ISSUER_DOMAIN` | Y | Y | Y | Your Clerk Frontend API domain, e.g. `https://your-app.clerk.accounts.dev` |

> Use separate Clerk applications for production vs. preview if you need isolated user databases.

---

## Convex (Backend)

| Variable | P | V | D | Notes |
|----------|---|---|---|-------|
| `NEXT_PUBLIC_CONVEX_URL` | Y | Y | Y | Deployment URL from Convex dashboard, e.g. `https://happy-animal-123.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | Y | Y | N | Used by `convex deploy` in CI — generate under Convex Dashboard → Settings → Deploy Keys |

### Convex Deploy Key Split (Preview vs. Production)

Convex uses two separate deploy key types, each scoped to a different environment:

| GitHub Secret | Key Type | Used In | Purpose |
|---------------|----------|---------|---------|
| `CONVEX_PREVIEW_DEPLOY_KEY` | **Preview** key | `preview-deploy` CI job (PRs) | Deploys to an isolated per-PR Convex preview deployment and seeds synthetic data |
| `CONVEX_PROD_DEPLOY_KEY` | **Production** key | Manual or a future `deploy-prod` CI job | Deploys schema and functions to the production Convex deployment |

**Key rules:**
- Preview keys can only deploy to preview deployments — they cannot touch production.
- Production keys should be tightly guarded; prefer manual `pnpm deploy:convex:prod` runs or a protected CI environment.
- `ALLOW_SEED=true` is set automatically on preview deployments by CI. It is **never** set on production.
- Generate both key types under: Convex Dashboard → your project → Settings → Deploy Keys.

---

## OpenAI

| Variable | P | V | D | Notes |
|----------|---|---|---|-------|
| `OPENAI_API_KEY` | Y | Y | Y | Platform API key from platform.openai.com |

---

## Sentry (Observability)

| Variable | P | V | D | Notes |
|----------|---|---|---|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Y | Y | Y | DSN from Sentry project settings — safe for client |
| `SENTRY_AUTH_TOKEN` | Y | Y | N | Auth token for source map upload during build — generate under Sentry → Settings → Auth Tokens |
| `SENTRY_ORG` | Y | Y | N | Sentry organization slug |
| `SENTRY_PROJECT` | Y | Y | N | Sentry project slug |

---

## Feature Flags

| Variable | P | V | D | Notes |
|----------|---|---|---|-------|
| `ALLOW_SEED` | N | Y | Y | Set to `"true"` on Preview and Development only. Enables database seed endpoints. Must NOT be set on Production. |

---

## Notes

- Variables prefixed with `NEXT_PUBLIC_` are bundled into the client-side JavaScript. Never put secrets in these.
- `SENTRY_AUTH_TOKEN` is only needed at build time (source map upload). Do not expose it to runtime.
- `CONVEX_DEPLOY_KEY` is only used in CI during `convex deploy` — not needed at runtime.
- When using Vercel's GitHub integration, Preview deployments automatically inherit variables scoped to **Preview**.
