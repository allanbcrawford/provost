# Provost browser audit runner

Drives [`agent-browser`](https://github.com/vercel-labs/agent-browser) against two CDP-attached Chrome sessions (one admin, one member) and runs the v1 audit checklist as deterministic checks. Writes a per-run markdown + JSON to `docs/walkthrough/runs/`.

## One-time setup

```bash
npm i -g agent-browser
agent-browser install        # downloads Chrome for Testing on first run
```

## Each-run setup

1. Start the dev server:

   ```bash
   pnpm dev
   ```

   Wait for the homepage to actually respond (`curl -s http://localhost:3000 | head` returns HTML, not a hang). Note: Next 16 + Turbopack has occasionally panicked on stale `.next` cache; if `pnpm dev` reports `Every task must have a task type` panics, kill it and run `rm -rf apps/web/.next && pnpm dev` again.

2. Launch two Chrome windows with separate profiles + remote debugging ports:

   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/provost-admin-profile \
     http://localhost:3000 &

   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9223 \
     --user-data-dir=/tmp/provost-member-profile \
     http://localhost:3000 &
   ```

3. Sign in:
   - Window on **9222** as a Williams **admin** (e.g. Robert).
   - Window on **9223** as a Williams **member** (e.g. David).

## Run

```bash
node scripts/audit/run-audit.mjs                          # all checks
node scripts/audit/run-audit.mjs --section "§2"            # one section
node scripts/audit/run-audit.mjs --id 8.1-assets-total     # one check
node scripts/audit/run-audit.mjs --base-url http://localhost:3001
```

Output:
- `docs/walkthrough/runs/<YYYY-MM-DD-HHmm>.md` — human-readable report
- `docs/walkthrough/runs/<YYYY-MM-DD-HHmm>.json` — machine-readable results

Exit code `0` if all pass, `1` otherwise — wire into CI when ready.

## Adding a check

Edit `scripts/audit/checks.json`. Each entry:

```json
{
  "id": "8.3-asset-row-count",
  "section": "§8 Assets",
  "title": "/assets shows 7 asset rows",
  "for": ["robert"],
  "navigate": "/assets",
  "eval": "document.querySelectorAll('[data-testid=\"asset-row\"]').length",
  "pass": "r === 7"
}
```

- `for` — session names from `sessions[]`.
- `navigate` — path to load before evaluating (omit if you want to evaluate the current page).
- `eval` — single JS expression returning a JSON-serializable value. Wrap multi-statement logic in an IIFE.
- `pass` — JS expression with `r` (the eval result) and `session` (the current session object) in scope; must return a truthy value.
- `useErrorsCommand: true` — uses `agent-browser errors` instead of `eval` (returns string of console errors, empty on pass).

## Why this design

- **Stateless checks JSON** keeps the audit auditable: anyone can read `checks.json` and see exactly what is being asserted.
- **One default agent-browser session, swapped via `close` + `connect <port>`** rather than `--session <name>` — that combo wedges the daemon. Stale `~/.agent-browser/*.sock` from killed daemons also wedge it; the runner cleans those before the first attach.
- **Hydration wait** (URL-settle + greeting non-skeleton + innerText-length-stable) is required because Next 16 SPA + Convex websockets hydrate client-side after the page commits — naive `eval` races the still-loading page and returns 0/empty.
- **No `wait --load networkidle`** — Convex websockets keep the network active forever.

## Known sharp edges

- **Hydration wait adds ~2–3s per check.** Full audit at 24 checks ≈ 1 minute. For a hundred-item run, expect ~5 min.
- **Clerk session expiry** in either Chrome will quietly degrade results (logged-out skeletons, redirects to sign-in). The hydration wait detects "Hi, there" specifically and times out, but if Clerk redirects to a different sign-in route entirely the runner will report the actual page state. Re-sign-in and re-run.
- **`agent-browser eval` JSON-decodes its stdout.** Returning `undefined`, functions, or DOM nodes is a runtime error. Always return primitives or plain objects/arrays.
