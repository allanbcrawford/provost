# Legacy Data Migration Scripts

These scripts exist as stubs for migrating production data from the legacy stack
(Supabase + provost-backend-fastapi) into the new Convex-backed `provost/` monorepo.

## When to use these scripts

At initial cutover the legacy database contained only demo/seed data, so no migration
was required. If real user data was onboarded to the legacy stack before decommission,
implement and run these scripts **before** Phase 2 (freeze) of the decommission plan.

See `docs/deploy/decommission.md` Phase 1 for the full checklist.

## Scripts

| Script | Purpose |
|---|---|
| `migrate-users.ts` | Migrate user records from Supabase to Convex |
| `migrate-documents.ts` | Migrate document records from Supabase to Convex |

## Running

```bash
# Install dependencies (from repo root)
pnpm install

# Dry-run — logs what would be migrated without writing
DRY_RUN=true npx tsx scripts/migrate/migrate-users.ts
DRY_RUN=true npx tsx scripts/migrate/migrate-documents.ts

# Live run — writes to Convex
npx tsx scripts/migrate/migrate-users.ts
npx tsx scripts/migrate/migrate-documents.ts
```

## Prerequisites

Set the following environment variables before running:

```bash
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<key>
export CONVEX_URL=<your-convex-deployment-url>
export CONVEX_DEPLOY_KEY=<your-convex-deploy-key>
```

## Implementing the stubs

Each stub file contains a `TODO` comment at the top with the data shape expected.
Implement the migration logic before running in production. Run against a staging
Convex deployment first to verify the output.
