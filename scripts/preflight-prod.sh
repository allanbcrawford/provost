#!/usr/bin/env bash
# preflight-prod.sh
#
# Pre-flight checks before DNS cutover to production.
# Exits non-zero if any check fails.
#
# Usage:
#   EXPECTED_SHA=$(git rev-parse HEAD) bash scripts/preflight-prod.sh
#
# Required env vars (must be set in shell or exported):
#   NEXT_PUBLIC_CONVEX_URL     - Production Convex deployment URL
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY - Clerk production publishable key (pk_live_...)
#   NEXT_PUBLIC_SENTRY_DSN     - Sentry DSN
#   EXPECTED_SHA               - Git SHA that must be HEAD (pass via env or set below)

set -euo pipefail

PASS=0
FAIL=1
errors=0

red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
info()  { printf '  %s\n' "$*"; }

check_pass() { green "  [PASS] $1"; }
check_fail() { red   "  [FAIL] $1"; errors=$((errors + 1)); }

echo ""
echo "===== Provost Production Pre-flight ====="
echo ""

# -------------------------------------------------------------------
# 1. Convex prod URL reachable
# -------------------------------------------------------------------
echo "1. Convex production deployment reachable..."

CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:-}"
if [[ -z "$CONVEX_URL" ]]; then
  check_fail "NEXT_PUBLIC_CONVEX_URL is not set"
else
  # Convex deployments expose a version endpoint; a 200 confirms the deployment is up.
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${CONVEX_URL}/version" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    check_pass "Convex URL reachable (HTTP $HTTP_STATUS): $CONVEX_URL"
  else
    check_fail "Convex URL returned HTTP $HTTP_STATUS (expected 200): $CONVEX_URL"
    info "Check: Convex Dashboard → provost-prod → Health"
  fi
fi

# -------------------------------------------------------------------
# 2. Clerk production key present and looks like a live key
# -------------------------------------------------------------------
echo "2. Clerk production publishable key set..."

CLERK_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
if [[ -z "$CLERK_KEY" ]]; then
  check_fail "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set"
elif [[ "$CLERK_KEY" == pk_live_* ]]; then
  check_pass "Clerk publishable key present and is a production key (pk_live_...)"
elif [[ "$CLERK_KEY" == pk_test_* ]]; then
  check_fail "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a TEST key (pk_test_...) — production requires pk_live_..."
else
  check_fail "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY has unexpected format: ${CLERK_KEY:0:12}..."
fi

# -------------------------------------------------------------------
# 3. Sentry DSN present
# -------------------------------------------------------------------
echo "3. Sentry DSN configured..."

SENTRY_DSN="${NEXT_PUBLIC_SENTRY_DSN:-}"
if [[ -z "$SENTRY_DSN" ]]; then
  check_fail "NEXT_PUBLIC_SENTRY_DSN is not set"
elif [[ "$SENTRY_DSN" == https://* ]]; then
  check_pass "Sentry DSN present: ${SENTRY_DSN:0:40}..."
else
  check_fail "NEXT_PUBLIC_SENTRY_DSN does not look like a valid DSN (expected https://...): $SENTRY_DSN"
fi

# -------------------------------------------------------------------
# 4. Git HEAD matches expected SHA
# -------------------------------------------------------------------
echo "4. Git HEAD matches expected SHA..."

EXPECTED="${EXPECTED_SHA:-}"
if [[ -z "$EXPECTED" ]]; then
  check_fail "EXPECTED_SHA env var is not set — cannot verify git HEAD"
  info "Usage: EXPECTED_SHA=\$(git rev-parse HEAD) bash scripts/preflight-prod.sh"
else
  ACTUAL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  if [[ "$ACTUAL" == "$EXPECTED" ]]; then
    check_pass "Git HEAD matches: $ACTUAL"
  else
    check_fail "Git HEAD mismatch — expected $EXPECTED, got $ACTUAL"
    info "Ensure you are on the correct branch and have no uncommitted rebases."
  fi
fi

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
echo ""
echo "==========================================="
if [[ "$errors" -eq 0 ]]; then
  green "All checks passed. Ready for DNS cutover."
  echo ""
  exit 0
else
  red "$errors check(s) failed. Resolve issues before proceeding."
  echo ""
  exit 1
fi
