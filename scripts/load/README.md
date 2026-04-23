# Load Tests

k6 load test scripts for Provost staging performance validation.

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Running Against Staging

Both scripts accept environment variables:

| Variable    | Description                        | Default                       |
|-------------|------------------------------------|-------------------------------|
| `BASE_URL`  | Staging base URL (no trailing `/`) | `https://staging.provost.app` |
| `API_TOKEN` | Bearer token for authenticated reqs | `""` (public endpoints only) |

### Chat Load Test (`k6-chat.js`)

Simulates **20 concurrent users** each sending 5 chat messages over a 2-minute window.

```bash
k6 run \
  -e BASE_URL=https://staging.provost.app \
  -e API_TOKEN=<your-staging-token> \
  scripts/load/k6-chat.js
```

### Graph Load Test (`k6-graph.js`)

Simulates **50 concurrent users** loading the `/family` graph page over a 2-minute window.

```bash
k6 run \
  -e BASE_URL=https://staging.provost.app \
  -e API_TOKEN=<your-staging-token> \
  scripts/load/k6-graph.js
```

## Acceptance Thresholds

| Script        | Metric                  | Threshold        |
|---------------|-------------------------|------------------|
| k6-chat.js    | p95 time to first token | < 3 000 ms       |
| k6-chat.js    | p99 time to completion  | < 10 000 ms      |
| k6-chat.js    | error rate              | < 5 %            |
| k6-graph.js   | p95 graph load time     | < 1 500 ms       |
| k6-graph.js   | p95 http_req_duration   | < 1 500 ms       |
| k6-graph.js   | error rate              | < 5 %            |

Tests fail (non-zero exit) when any threshold is breached. k6 prints a summary
table after every run — look for `✓` (pass) or `✗` (fail) next to each threshold.

## CI Integration

Load tests are intentionally **not** run automatically on every push — they're
expensive and require a live staging environment. Use the
[Load Test workflow](../../.github/workflows/load-test.yml) for manual runs
via GitHub Actions (`workflow_dispatch`).

## Notes

- Do not run these against production.
- The `API_TOKEN` must belong to an account that has access to the staging
  Convex deployment.
- If the staging environment has Clerk authentication enabled, obtain a token
  via the Clerk Dashboard → Users → impersonate → copy session token.
