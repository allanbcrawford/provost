# Legacy Decommission Plan — provost-fe + provost-backend-fastapi

This document describes the full decommission sequence for the two legacy repositories
(`provost-fe` and `provost-backend-fastapi`) and their associated infrastructure.

**Nothing in this document executes automatically.** Every step below is a manual, operator-triggered
action. Read it end-to-end before starting.

**Trigger condition:** 48 hours after production DNS cutover, Sentry metrics are clean, and the
post-cutover sign-off table in `docs/deploy/cutover.md` is fully completed.

---

## Overview of Legacy Stack

| Component | Repo / Service | Notes |
|---|---|---|
| React frontend | `provost-fe` | Create React App, served via legacy hosting |
| Python API | `provost-backend-fastapi` | FastAPI on ECS (Fargate) |
| Database | Supabase (Postgres) | Managed; data will be retained as backup |
| Cache | Redis cluster | Separate from Convex |
| Container registry | ECR | `provost-backend` image repository |

The new stack (`provost/`) replaces all of the above with Vercel (frontend) + Convex (backend + DB).

---

## Phase 1: Data Migration Verification

### Current data status (demo / pre-production)

At the time of initial cutover, the legacy Supabase database contains only seed / demo data.
There is no production family data that requires migration. The new Convex deployment starts
empty and is populated by real users after launch.

If that assumption changes before cutover (i.e., pilot users have been onboarded to the legacy
stack), run the migration scripts in `scripts/migrate/` **before** proceeding to Phase 2.
See `scripts/migrate/README.md` for instructions.

### Verification checklist

- [ ] Confirm with product owner that no real user accounts exist in the legacy Supabase instance.
- [ ] If real accounts exist:
  - [ ] Run `scripts/migrate/migrate-users.ts` (implement first — see stub).
  - [ ] Run `scripts/migrate/migrate-documents.ts` (implement first — see stub).
  - [ ] Verify migrated records in Convex Dashboard before continuing.
- [ ] Export a final Supabase backup: Dashboard → Settings → Database → Backups → Download.
- [ ] Store the backup archive in a secure, access-controlled location (e.g. S3 bucket with versioning).

---

## Phase 2: Freeze Legacy Writes

These steps make the legacy stack read-only before tearing it down, preventing any new data
from being written to a system that is about to be deleted.

1. **Disable FastAPI write endpoints** — Set the `MAINTENANCE_MODE=true` environment variable
   on the ECS task definition. The API should return `HTTP 503` on all mutating routes
   (`POST`, `PUT`, `PATCH`, `DELETE`). Read routes may remain active during the freeze window.

2. **Set Supabase Row Level Security to read-only** — In the Supabase Dashboard:
   - Open Table Editor for each table that receives writes (`users`, `documents`, etc.).
   - Disable or tighten the INSERT/UPDATE/DELETE RLS policies so no new rows can be written.

3. **Verify freeze** — Run a smoke test against the legacy API to confirm writes return 503:
   ```bash
   curl -X POST https://<legacy-api-domain>/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{"email":"smoke@test.invalid"}' \
     -w "\nHTTP %{http_code}\n"
   # Expected: HTTP 503
   ```

4. **Notify any integration partners** (see Phase 6) that the legacy API is now in maintenance mode.

---

## Phase 3: Final Backup

Before deleting anything, take a final point-in-time snapshot.

1. **Supabase backup** (if not already done in Phase 1):
   ```
   Supabase Dashboard → Settings → Database → Backups → Create backup
   ```
   Download and store per data retention policy (see Phase 7).

2. **ECS task definition snapshot** — Export the current task definition JSON for reference:
   ```bash
   aws ecs describe-task-definition --task-definition provost-backend \
     --query taskDefinition > legacy-ecs-task-def-final.json
   ```
   Commit this file to a private archive location (not in the active repo).

3. **ECR image snapshot** — Before applying a retention policy, record the final image digest:
   ```bash
   aws ecr list-images --repository-name provost-backend \
     --query 'imageIds[*].imageDigest'
   ```

---

## Phase 4: Tag Legacy Repos Before Archival

Before archiving the GitHub repositories, tag the current HEAD of each repo so the exact
code at decommission time is permanently identifiable.

```bash
# In each legacy repo working directory:

# provost-fe
cd /path/to/provost-fe
git tag v-legacy-final
git push origin v-legacy-final

# provost-backend-fastapi
cd /path/to/provost-backend-fastapi
git tag v-legacy-final
git push origin v-legacy-final
```

Append the archive notice to each repo's README before pushing the tag. Use the stubs in
`docs/deploy/legacy-readme-stubs/` as the content to prepend.

---

## Phase 5: Tear Down Infrastructure

Complete these steps in order. Each step is independently reversible up until the
"delete" actions at the end.

### 5.1 ECS Services

```bash
# Scale ECS service to zero tasks (reversible)
aws ecs update-service \
  --cluster provost \
  --service provost-backend \
  --desired-count 0

# Wait for tasks to drain (typically < 5 minutes)
aws ecs wait services-stable \
  --cluster provost \
  --services provost-backend

# Delete the service (irreversible)
aws ecs delete-service \
  --cluster provost \
  --service provost-backend \
  --force
```

### 5.2 ECR Image Retention Policy

Apply a lifecycle policy that keeps the `v-legacy-final` tagged image indefinitely but
expires all untagged images after 30 days:

```bash
aws ecr put-lifecycle-policy \
  --repository-name provost-backend \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep v-legacy-final tag forever",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v-legacy-final"],
          "countType": "imageCountMoreThan",
          "countNumber": 999
        },
        "action": { "type": "expire" }
      },
      {
        "rulePriority": 2,
        "description": "Expire untagged images after 30 days",
        "selection": {
          "tagStatus": "untagged",
          "countType": "sinceImagePushed",
          "countUnit": "days",
          "countNumber": 30
        },
        "action": { "type": "expire" }
      }
    ]
  }'
```

### 5.3 Redis Cluster

```bash
# Delete the Redis replication group (irreversible)
aws elasticache delete-replication-group \
  --replication-group-id provost-legacy-redis \
  --no-retain-primary-cluster

# Wait for deletion
aws elasticache wait replication-group-deleted \
  --replication-group-id provost-legacy-redis
```

### 5.4 Supabase Project

The Supabase project should be paused rather than deleted immediately, to allow a
recovery window in case any data was missed.

```
Supabase Dashboard → Project Settings → General → Pause Project
```

After 30 days with no issues, delete the project:

```
Supabase Dashboard → Project Settings → General → Delete Project
```

> Data retention: Download and archive the final backup before deletion. See Phase 7.

### 5.5 Archive GitHub Repositories

```
GitHub → provost-fe → Settings → Danger Zone → Archive this repository
GitHub → provost-backend-fastapi → Settings → Danger Zone → Archive this repository
```

Both repositories should be archived (read-only), not deleted. The `v-legacy-final` tag
preserves the final state permanently.

---

## Phase 6: Integration Partner Notification

Before and during decommission, communicate with any external systems pointing at the
legacy API endpoints.

### Known integration points to audit

- [ ] Check Clerk webhooks for any URL pointing at the legacy FastAPI domain.
- [ ] Check any CI/CD pipelines in other repos that POST to the legacy API.
- [ ] Check Sentry alert routing rules that reference the legacy service name.
- [ ] Notify internal team members who may have the legacy URL bookmarked or in tooling.

### Communication template

```
Subject: [Action Required] Legacy provost API endpoint is being decommissioned

The provost-backend-fastapi service will be shut down on [DATE].

Old endpoint: https://<legacy-api-domain>/api/v1/
New endpoint: https://provost.app/ (Convex-backed, see updated API docs)

If you have integrations pointing at the old endpoint, please update them before [DATE].
After that date the old endpoint will return 503 and be removed.

Questions: #eng-provost on Slack
```

---

## Phase 7: Data Retention

Per compliance SOP (chuck-head-of-compliance spec), all data backups from the legacy
Supabase instance must be retained for **2 years** from the date of decommission.

| Artifact | Format | Retention Location | Retention Period |
|---|---|---|---|
| Supabase DB backup | `.dump` / `.sql.gz` | S3 bucket `provost-archive-backups` | 2 years |
| ECS task definition JSON | `.json` | S3 bucket `provost-archive-backups` | 2 years |
| Final ECR image (v-legacy-final) | Docker image | ECR (lifecycle policy above) | Indefinite |
| Legacy repo code | Git history | GitHub (archived, not deleted) | Indefinite |

Label all backup objects with the decommission date in the S3 key prefix:
`s3://provost-archive-backups/decommission-<YYYY-MM-DD>/`

Set an S3 Object Lock or lifecycle expiry on the bucket to enforce the 2-year minimum.

---

## Decommission Sign-off Checklist

Complete in order. Do not proceed past any unchecked item without documented justification.

### Phase 1 — Data
- [ ] Data migration verification complete (or confirmed: no real user data)
- [ ] Final Supabase backup downloaded and stored

### Phase 2 — Freeze
- [ ] Legacy API write endpoints returning 503
- [ ] Supabase RLS policies set to read-only
- [ ] Integration partners notified of maintenance mode

### Phase 3 — Backup
- [ ] Final point-in-time backup created
- [ ] ECS task definition JSON exported
- [ ] ECR final image digest recorded

### Phase 4 — Tag
- [ ] `v-legacy-final` tag pushed to `provost-fe`
- [ ] `v-legacy-final` tag pushed to `provost-backend-fastapi`
- [ ] Archive README notice prepended to each legacy repo

### Phase 5 — Teardown
- [ ] ECS service scaled to 0 and deleted
- [ ] ECR lifecycle policy applied
- [ ] Redis cluster deleted
- [ ] Supabase project paused (then deleted after 30-day window)
- [ ] `provost-fe` repo archived on GitHub
- [ ] `provost-backend-fastapi` repo archived on GitHub

### Phase 6 — Partners
- [ ] All integration partners notified and confirmed updated

### Phase 7 — Retention
- [ ] Backup artifacts stored in `s3://provost-archive-backups/decommission-<date>/`
- [ ] S3 retention policy / Object Lock set for 2-year minimum
- [ ] Decommission date recorded: _______________

| Step | Owner | Date completed |
|---|---|---|
| Phase 1: Data verified | | |
| Phase 2: Writes frozen | | |
| Phase 3: Final backup | | |
| Phase 4: Repos tagged | | |
| Phase 5: Infra torn down | | |
| Phase 6: Partners notified | | |
| Phase 7: Retention confirmed | | |
