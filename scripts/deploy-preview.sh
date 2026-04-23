#!/usr/bin/env bash
# deploy-preview.sh
#
# Triggers a Vercel preview deployment for the provost web app.
# Run from the monorepo root.
#
# Prerequisites:
#   - pnpm dlx vercel link has been run (creates .vercel/project.json)
#   - VERCEL_TOKEN env var set, or you are already logged in via vercel login
#
# Usage:
#   bash scripts/deploy-preview.sh
#
# In CI, set these env vars from GitHub Secrets:
#   VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running local build sanity check..."
pnpm --filter @provost/web build

echo "Deploying preview to Vercel..."
pnpm dlx vercel \
  --cwd "${REPO_ROOT}/apps/web" \
  --token "${VERCEL_TOKEN:-}" \
  --no-wait

echo ""
echo "Preview deployment triggered. Check vercel.com/provost/deployments for the URL."
