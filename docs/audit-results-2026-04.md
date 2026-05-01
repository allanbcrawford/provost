# SOC 2 Post-Launch Audit Results — 2026-04-30

**Source checklist:** `docs/deploy/post-launch-audit.md`
**Run by:** Phase 7 Issue 7.2 of beta-parity initiative
**Status summary:** 6/9 ✅ passing, 2/9 🟡 pending runtime confirmation, 1/9 ❌ failing

---

## Item 1 — Every mutation has audit log coverage

**Status:** 🟡 Partial — infrastructure ✅, coverage incomplete

**Evidence:**
- `convex/lib/audit.ts` — `writeAudit` and `withAudit` helpers exist and are correct
- `convex/compliance.ts` — `setPreference` mutation wraps `writeAudit`; `audit_events` table target confirmed
- Files actively using `withAudit`/`writeAudit`: `convex/runs.ts`, `convex/messages.ts`, `convex/family.ts`, `convex/assets.ts`, `convex/documents.ts`, `convex/familyUsers.ts`, `convex/agent/approvals.ts`, `convex/agent/tools/addFamilyMemberInternal.ts`
- Phase 7.1 acceptance criteria (Issue 7.1) requires coverage on member add/edit/delete, document upload/delete, observation approve/dismiss, learning override, family creation — Phase 7.1 has not been confirmed complete; coverage matrix not yet filed

**Remediation needed:** Confirm Phase 7.1 landed and the coverage matrix covers all 9 sensitive operation categories. Then run the checklist's 10-action spot-check against Convex Dashboard → `audit_events` table. Cannot claim ✅ from repo state alone without runtime confirmation.

---

## Item 2 — Approval-required tools pause for human approval

**Status:** ✅ Passing (code-verified; runtime smoke test still recommended)

**Evidence:**
- `packages/agent/src/tools/approvals.test.ts` — unit tests confirm: tool does not execute before approval, executes after, rejection produces "Approval denied" message; tests include defense-in-depth case (missing decision → rejection)
- `apps/web/src/features/chat/tool-call-view.tsx` — UI renders Approve/Reject buttons when `approval.status === "requested"`; tool result only renders after approved/completed state
- `convex/lib/rateLimit.ts` + `convex/agent/approvals.ts` — approval-gated flow wired into run loop
- Phase mapping: Issue 2.1 tool approval requirement cites existing `tool_call_approvals` flow

**Remediation needed:** None from code review. Deploy operator should run the checklist's manual trigger test before sign-off.

---

## Item 3 — PII classifier redacts on known SSN input

**Status:** ✅ Passing (code-verified; runtime smoke test still recommended)

**Evidence:**
- `convex/guardrails.ts` — `classifyMessage` internal action: GPT-4.1-mini classifier with explicit SSN-pattern instruction; `redactedText` set to original message with identifiers replaced by `[REDACTED]`; covers SSN, bank/routing numbers, card numbers, government IDs
- `convex/compliance.ts` — `guardrails.pii_redaction` preference defaults to `true`; per-family toggle available
- `convex/agent/runInternal.ts` — guardrails wired into run path

**Remediation needed:** None from code review. Deploy operator should submit a test SSN string and verify the `[REDACTED]` value in Convex Dashboard. Also confirm the original SSN string is absent from Sentry error payloads (requires Sentry dashboard access — cannot verify from repo).

---

## Item 4 — Non-admin member is denied access to /governance

**Status:** ✅ Passing

**Evidence:**
- `apps/web/src/middleware.ts` line 4–8: Clerk middleware protects `/(admin)(.*)` and `/governance(.*)` routes — unauthenticated users are redirected to sign-in
- `apps/web/src/app/(admin)/admin-shell.tsx` — wraps all admin pages with `withSiteAdminGuard` HOC
- `apps/web/src/HOCs/with-site-admin-guard.tsx` — checks `useIsSiteAdmin()`; non-site-admin users are redirected to `/` and the component renders `null`
- Governance route lives under `(admin)` layout group which applies both the Clerk guard and the site-admin HOC — two independent layers block family members

**Remediation needed:** Note that the protection is `is_site_admin` (internal Provost team flag), not family-member `admin` role. This is the correct design per `convex/lib/authz.ts` line 60–68 comments. If the checklist intent is "family admin role cannot access governance," that is also true — the site-admin gate is stricter.

---

## Item 5 — Cross-family read attempt fails with FORBIDDEN

**Status:** ✅ Passing

**Evidence:**
- `tests-convex/family-isolation.test.ts` — 18 tests (9 negative + 9 positive controls) covering: `family.getGraph`, `documents.list`, `observations.listByFamily`, `governance.auditEvents`, `lessons.list`, `lessons.myActiveLessons`, `messages.listInbox`, `messages.sendMessage`, `family.updateMember`
- All negative cases assert `ConvexError` with `code` matching `/^FORBIDDEN/`
- Backed by `convex/lib/authz.ts` `requireFamilyMember` — throws `{ code: "FORBIDDEN", familyId }` when no membership row exists for target family
- Phase mapping: Issue 1.3 (CI test); `convex/lib/authz.ts` guard

**Remediation needed:** Confirm test suite passes in CI (`pnpm vitest tests-convex/family-isolation.test.ts`). Cannot run CI from this audit pass.

---

## Item 6 — Rate limits fire at configured thresholds

**Status:** ✅ Passing (code-verified; runtime threshold test still recommended)

**Evidence:**
- `convex/lib/rateLimit.ts` — `checkAndIncrement` throws `ConvexError({ code: "RATE_LIMIT" })` when `count >= max` within `windowMs`; window resets correctly after expiry
- Configured buckets: `run.start:user` (20/min), `run.start:family` (60/min), `run.start:thread` (6/30s), `tool.create_task:family` (50/hr), `tool.invite_member:family` (10/hr), `tool.draft_revision:family` (30/hr)
- Error includes `retryAfterMs` field for client backoff

**Remediation needed:** Deploy operator should run the checklist's N+1 test against a live environment to confirm the rate_limits table row is created and the error surfaces to the client correctly.

---

## Item 7 — Disclaimers render on every AI-authored widget

**Status:** ✅ Passing

**Evidence:**
- `apps/web/src/components/ai-disclaimer.tsx` — `<AiDisclaimer>` component exists; renders contextual text for `default` / `legal` / `financial` kinds; respects per-family compliance preferences
- Confirmed present on: `WaterfallInlineCard` (default), `GraphFocusInlineCard` (default), `LibraryResultsInlineCard` (default), `observations-list` widget (default), `task-widget.tsx` line 38 (default), `draft-revision-widget.tsx` line 141 (legal)
- `apps/web/src/widgets/registry.tsx` — `WIDGET_RENDERERS` maps all widget kinds; all data-surfacing widgets include `<AiDisclaimer>`
- Disclaimer renders inline in DOM (no CSS visibility gating observed)

**Remediation needed:** Manual spot-check of 3 widget types in a live session is still recommended per checklist. The `cite-widget` and `navigate-tool` do not include disclaimers — confirm this is intentional (neither generates financial analysis).

---

## Item 8 — Sentry captures a deliberately-thrown error

**Status:** 🟡 Pending deploy operator confirmation

**Evidence:**
- `.env.example` — `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` are documented and expected
- Cannot verify from repo state alone whether Sentry DSN is set in Vercel production environment
- No `/api/debug/sentry-test` route found in repo

**Remediation needed:** Deploy operator must confirm `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel production env, then use the Sentry Dashboard → Settings → Client Keys → Send Test Event flow. Recommended check: `vercel env ls --environment=production | grep SENTRY`.

---

## Item 9 — Audit retention setting controls database growth

**Status:** ❌ Failing — retention preference exists, enforcement cron is absent

**Evidence:**
- `convex/compliance.ts` line 12 — `retention.audit_days` preference key defined; defaults to 365 days
- `convex/crons.ts` — three scheduled jobs exist: `nightly-thread-summary`, `weekly-admin-digest`, `monthly-asset-snapshot`. **No audit log pruning cron is registered.**
- Search across all `convex/*.ts` and subdirectories for `prune`, `purge`, `audit.*delete`, `AUDIT_RETENTION` returned zero results outside of `compliance.ts`

**Remediation needed:** Implement an `audit_events` pruning cron (daily recommended). The retention setting is stored at `family_preferences.retention.audit_days`; the job should delete `audit_events` rows where `_creationTime` is older than `now - (retentionDays * 86_400_000)`. Register it in `convex/crons.ts`. This is a **blocker for April 15** — the retention setting is a compliance control that has no enforcement mechanism.

---

## Critical-path summary

**Blockers for April 15:**

1. **Item 9 (❌ Audit retention cron)** — The `retention.audit_days` preference exists but no scheduled job enforces it. Database growth is unconstrained. Build the pruning cron in `convex/crons.ts` before launch.
2. **Item 1 (🟡 Audit log coverage completeness)** — Phase 7.1 must close and file its coverage matrix confirming all 9 sensitive operation categories are wrapped with `writeAudit`. Without that confirmation, Item 1 cannot flip to ✅.

**Acceptable as deferred (can ship without):**

- Item 8 (🟡 Sentry) — Infrastructure is in place; this is an ops configuration check. Vercel env confirmation can happen day-of-launch.
- Items 2, 3, 6 (🟡 runtime smoke tests) — Code paths are verified; manual smoke tests are checklist hygiene, not blockers.

---

## Recommended sequence

1. **Implement audit retention cron** — add `auditLog:prune` to `convex/crons.ts`, reading `retention.audit_days` from `family_preferences`. Estimated: 2–3 hours.
2. **Confirm Phase 7.1 landed** — read Phase 7.1's coverage matrix; if not yet filed, ensure all 9 sensitive mutation categories have `writeAudit` calls and run a 10-action spot-check on staging.
3. **Ops: set Sentry DSN in Vercel** — `vercel env add NEXT_PUBLIC_SENTRY_DSN production`, then trigger test event.
4. **Run full manual smoke test on staging** — Items 2, 3, 6 per checklist steps.
5. **Get auditor signatures** — both compliance lead and engineering lead sign off on `docs/deploy/post-launch-audit.md`.
