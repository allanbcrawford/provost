# DNS Cutover Runbook — Production

This runbook covers the final step of launching provost.app: pointing the production domain at the Vercel deployment and verifying every system is healthy.

**Prerequisites completed before starting this runbook:**
- 7.1–7.5 done: Vercel project wired, CI passing, Convex prod deployed, staging smoke green, load tests pass thresholds.
- Approval pipeline tested end-to-end on staging.
- Security review sign-off obtained.
- At least one team member on standby for the cutover window.

---

## Pre-Cutover Checklist

Complete every item before touching DNS.

### Staging Health
- [ ] All staging smoke tests pass (see `docs/deploy/staging-smoke.md`)
- [ ] Load test p95 latency < 2 s for `/api/chat` and graph queries (see `scripts/load/README.md`)
- [ ] No unresolved `P0` or `P1` Sentry errors in staging in the last 24 h
- [ ] Audit log verified: entries appear for approval actions and tester invites

### Production Infrastructure
- [ ] Convex `provost-prod` deployment is live and shows **Health: green** in the Convex Dashboard
- [ ] Convex prod env vars set: `CLERK_JWT_ISSUER_DOMAIN`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY` — confirm via `npx convex env list --prod`
- [ ] `ALLOW_SEED` is **not** set on the production Convex deployment
- [ ] Clerk **Production** instance is active; at least one test user created and can sign in
- [ ] Vercel production deployment is promoted (status: **Ready**) on the `main` branch
- [ ] All production env vars set in Vercel → Settings → Environment Variables (Production scope):
  - `NEXT_PUBLIC_CONVEX_URL` → prod Convex URL
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `pk_live_...`
  - `CLERK_SECRET_KEY` → `sk_live_...`
  - `NEXT_PUBLIC_SENTRY_DSN` → Sentry DSN
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- [ ] `scripts/preflight-prod.sh` exits 0 (run after env vars are configured)
- [ ] Legacy app backup completed (database export, config snapshot)

### Approvals
- [ ] Engineering lead sign-off
- [ ] Product owner / stakeholder sign-off
- [ ] On-call engineer identified and available for at least 2 h post-cutover

---

## Day-of Steps

Estimated time: 30–60 minutes active, up to 48 h for full DNS propagation globally.

### 1. Run preflight script

```bash
EXPECTED_SHA=$(git rev-parse HEAD) bash scripts/preflight-prod.sh
```

All checks must pass before proceeding.

### 2. Set the Vercel production domain alias

In the Vercel Dashboard:

1. Open **provost** project → **Settings → Domains**.
2. Click **Add Domain** and enter `provost.app` (and `www.provost.app` if applicable).
3. Vercel shows the DNS records required:
   - For the apex domain (`provost.app`): an **A record** pointing to Vercel's IP (`76.76.21.21`)
   - For `www`: a **CNAME** pointing to `cname.vercel-dns.com`

### 3. Update DNS records

In your DNS provider (e.g. Cloudflare):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `provost.app` | `76.76.21.21` | 60 s (or Auto on Cloudflare proxy-off) |
| CNAME | `www` | `cname.vercel-dns.com` | 60 s |

> Set TTL to 60 s before the cutover so rollback propagation is fast. Raise it back to 3600 s after 48 h of stability.

> If the domain is currently pointing to legacy infrastructure, note the current A record before changing it — you will need it for rollback.

### 4. Monitor DNS propagation

```bash
# Poll until the A record resolves to Vercel
watch -n 10 "dig +short provost.app A"

# Or check from multiple global vantage points
curl -s "https://dns.google/resolve?name=provost.app&type=A" | jq '.Answer[].data'
```

Vercel issues a TLS certificate automatically once it validates DNS. This takes 2–10 minutes on Cloudflare; up to 20 minutes on other registrars.

### 5. Verify TLS and app health

Once `provost.app` resolves to Vercel:

```bash
curl -Iv https://provost.app 2>&1 | grep -E "HTTP|< " | head -20
```

Expected: `HTTP/2 200` (or redirect to sign-in).

- [ ] `https://provost.app` loads without TLS error
- [ ] Redirected to `/sign-in` when unauthenticated
- [ ] Sign-in with Clerk Production instance completes
- [ ] Home page loads with correct family data (no seed data — prod DB is empty at first launch)
- [ ] Chat panel responds within 30 s
- [ ] `/governance/audit` loads

### 6. Monitor Sentry for the first 30 minutes

Open **Sentry → provost → Issues** and watch for new errors. Set up a live alert if not already configured.

Acceptable: zero new `P0` errors. Investigate any spike in `P1` errors immediately.

### 7. Announce the launch

Send the communications in `docs/deploy/announcement.md` once the app is verified healthy.

---

## Rollback Plan

If any critical failure is detected, roll back within the 48-hour "frozen" window:

### Immediate rollback (< 5 minutes)

1. **Re-point DNS** to the legacy server:
   - Restore the A record to its pre-cutover value (recorded in Step 3).
   - TTL should be 60 s — propagation completes in under 5 minutes on Cloudflare.

2. Notify the team via the Slack template in `docs/deploy/announcement.md`.

### Vercel deployment rollback (if DNS is already settled)

```bash
pnpm dlx vercel rollback
# or via Dashboard: provost → Deployments → previous → Promote to Production
```

### Convex rollback

```bash
# Deploy from the last known-good git SHA
git checkout <previous-sha>
npx convex deploy --prod
git checkout main
```

### Frozen period

For 48 hours after cutover:
- Do **not** merge non-critical changes to `main`.
- Keep the previous Vercel deployment available (do not delete it).
- Keep legacy infrastructure running in read-only mode until the 48 h window closes.
- After 48 h of clean Sentry metrics, decommission legacy (see Task 7.7).

---

## Post-Cutover Sign-off

| Step | Owner | Time | Result |
|------|-------|------|--------|
| Preflight script passed | | | |
| DNS cutover completed | | | |
| TLS verified | | | |
| Smoke test passed on prod | | | |
| Sentry 30-min watch clean | | | |
| Announcements sent | | | |
| TTL raised back to 3600 s | | (T+48 h) | |
| Legacy decommission scheduled | | (T+48 h) | |
