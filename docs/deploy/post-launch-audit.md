# Post-Launch Audit Checklist

**Audience:** Compliance lead (chuck-head-of-compliance), engineering lead.
**Purpose:** Verify all security, compliance, and operational controls are functioning in production before the platform is considered fully live.
**Cadence:** Complete within 72 hours of production DNS cutover. Repeat quarterly.

---

## Sign-Off Block

| Auditor | Role | Date | Signature |
|---------|------|------|-----------|
| | Head of Compliance | | |
| | Engineering Lead | | |

**All 9 items must be checked before signing.**

---

## Audit Items

### 1. Every mutation has audit log coverage

**What to verify:** Recent mutations appear in the audit log with actor, timestamp, and action type.

**Steps:**

1. Perform 5–10 actions as a signed-in family member: update a document, submit an approval, add a note.
2. Navigate to `/governance/audit` (admin required) or open Convex Dashboard → Data → `auditLog` table.
3. Confirm each action has a corresponding row with:
   - `actorId` matching the user who performed the action
   - `action` field correctly describing the mutation
   - `timestamp` within seconds of the action
   - `familyId` correctly scoped

**Pass criteria:** All 10 spot-checked actions appear in audit log within 30 seconds.

- [ ] PASS — 10/10 mutations found in audit log
- [ ] Notes: ___

---

### 2. Approval-required tools pause for human approval

**What to verify:** AI tool calls that require approval (`requiresApproval: true`) present an approval UI and do not execute until approved.

**Steps:**

1. Sign in as a family member (non-admin).
2. Trigger a chat interaction that invokes an approval-gated tool (e.g., portfolio rebalance suggestion, document signing).
3. Observe that the chat panel displays the approval widget before any action is taken.
4. Verify the action is NOT executed until the approval button is clicked.
5. Click Approve and confirm the action completes.
6. Click Reject on a second attempt and confirm the action does not execute.

**Pass criteria:** Tool does not execute before approval; executes after approval; does not execute after rejection.

- [ ] PASS — approval gate fires correctly
- [ ] Notes: ___

---

### 3. PII classifier redacts on known SSN input

**What to verify:** The PII classifier correctly identifies and redacts Social Security Numbers before storage or display.

**Steps:**

1. As a test user, submit a document or chat message containing a known SSN pattern (e.g., `123-45-6789`).
2. Check the stored value in Convex Dashboard → Data → the relevant table.
3. Verify the SSN is replaced with `[REDACTED]` or the configured placeholder.
4. Confirm the original value does not appear in Sentry error payloads (search Sentry for the SSN string).

**Pass criteria:** SSN does not appear in database or error logs; redacted form is stored instead.

- [ ] PASS — PII redaction confirmed
- [ ] Notes: ___

---

### 4. Non-admin member is denied access to /governance

**What to verify:** The `/governance` route returns an unauthorized response for users without the `admin` role.

**Steps:**

1. Sign in as a standard family member (role: `member`).
2. Navigate directly to `/governance` or `/governance/audit`.
3. Observe the response: should be a 403 page, redirect to home, or "Access Denied" message.
4. Confirm no governance data is visible.

**Pass criteria:** Member-role user cannot access `/governance` in any form.

- [ ] PASS — /governance blocked for non-admin
- [ ] Notes: ___

---

### 5. Cross-family read attempt fails with FORBIDDEN

**What to verify:** A user from Family A cannot read data belonging to Family B.

**Steps:**

1. Sign in as a user belonging to `familyId: A`.
2. Attempt to directly query data scoped to `familyId: B` via browser console or API call:
   ```js
   // In browser console (authenticated as Family A user):
   // Attempt to fetch a document known to belong to Family B
   fetch('/api/convex/query', {
     method: 'POST',
     body: JSON.stringify({ fn: 'documents:list', args: { familyId: '<family-b-id>' } })
   })
   ```
3. Confirm the response is a `ConvexError` with code `FORBIDDEN` (HTTP 403 or matching error object).
4. Check Convex Logs to confirm the authorization check fired.

**Pass criteria:** Cross-family read returns FORBIDDEN; no Family B data is returned.

- [ ] PASS — cross-family isolation confirmed
- [ ] Notes: ___

---

### 6. Rate limits fire at configured thresholds

**What to verify:** The rate limiter rejects requests when a user exceeds the configured threshold.

**Steps:**

1. Identify the rate limit for a mutation (e.g., chat message: N per minute per user).
2. As a test user, submit that mutation N+1 times within the window.
3. Confirm the N+1th request returns a `RATE_LIMITED` error.
4. Wait for the rate limit window to expire and confirm subsequent requests succeed.

**Pass criteria:** Rate limit triggers at the configured threshold; clears after the window.

- [ ] PASS — rate limiting confirmed
- [ ] Notes: ___

---

### 7. Disclaimers render on every AI-authored widget

**What to verify:** Every widget or card generated by AI includes the required financial disclaimer.

**Steps:**

1. Sign in and trigger the AI to generate at least 3 different widget types (e.g., portfolio summary, net worth projection, lesson plan card).
2. For each widget, verify the disclaimer text is present (e.g., "This is not financial advice. Consult a licensed professional.").
3. Verify the disclaimer is visible without scrolling or user interaction.
4. Check the page source or DOM to confirm the disclaimer is not hidden via CSS.

**Pass criteria:** All 3 tested widget types display the disclaimer visibly.

- [ ] PASS — disclaimers present on all AI-authored widgets
- [ ] Notes: ___

---

### 8. Sentry captures a deliberately-thrown error

**What to verify:** The Sentry integration is correctly configured and capturing errors in production.

**Steps:**

1. Confirm `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel production environment.
2. Trigger a known test error (e.g., navigate to `/api/debug/sentry-test` if the route exists, or use the Sentry test button in Sentry Dashboard → Settings → Client Keys → Send Test Event).
3. Open Sentry → provost → Issues and confirm the test error appears within 60 seconds.
4. Verify the error includes:
   - Correct environment tag (`production`)
   - Stack trace pointing to the correct file/line
   - User context (if authenticated at time of error)

**Pass criteria:** Test error appears in Sentry within 60 seconds with correct metadata.

- [ ] PASS — Sentry capturing confirmed
- [ ] Notes: ___

---

### 9. Audit retention setting controls database growth

**What to verify:** The audit log retention policy is enforced — old entries are purged according to the configured retention period.

**Steps:**

1. Check the configured retention period in Convex env vars:
   ```bash
   npx convex env list --prod | grep AUDIT_RETENTION
   ```
2. Confirm a scheduled job exists for audit log pruning:
   - Open Convex Dashboard → Scheduled Functions → look for `auditLog:prune` or similar.
3. Verify the job runs on the expected cadence (daily recommended).
4. If possible, inspect `auditLog` table row count before and after a pruning run to confirm old entries are removed.

**Pass criteria:** Pruning job exists, runs on schedule, and removes entries older than the retention period.

- [ ] PASS — audit retention enforced
- [ ] Notes: ___

---

## Audit Complete

When all 9 items are checked PASS:

1. Both auditors sign the sign-off block at the top of this document.
2. Commit the signed copy to the repo:
   ```bash
   git add docs/deploy/post-launch-audit.md
   git commit -m "docs(audit): post-launch sign-off — $(date +%Y-%m-%d)"
   ```
3. Tag the release:
   ```bash
   git tag -a v1.0.0 -m "Platform v1.0.0 — post-launch audit complete"
   git push origin v1.0.0
   ```

---

## Related Documentation

- [Operations Runbook](./runbook.md)
- [Staging Smoke Tests](./staging-smoke.md)
- [Environment Variables](./env-vars.md)
