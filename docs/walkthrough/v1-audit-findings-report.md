# Provost v1 Browser Audit — Findings Report

**Run:** 2026-04-24 (dry run) and 2026-04-25 03:33 UTC (automated runner)
**Convex deployment:** `decisive-minnow-878` (dev)
**Frontend:** local `pnpm dev` against `http://localhost:3000`, Next 16.2.4 (Turbopack), Clerk dev keys
**Driver:** [`agent-browser`](https://github.com/vercel-labs/agent-browser) v0.26.0, two CDP-attached Chrome profiles
**Test accounts:**
- Port 9222 — **Robert Williams** — family `admin` role, **enduring** phase
- Port 9223 — **David Williams** — family `member` role, **operating** phase (per audit; reality below disputes this)

**Reference doc being audited:** [`docs/walkthrough/v1-browser-audit.md`](v1-browser-audit.md)

---

## TL;DR for the coding agent

Of the items the runner exercised end-to-end, **23 of 24 automated checks pass**. The single automated failure is `/governance` access for an admin user, which is a known consequence of the recent `site_admin` split (commit `4ebb866`) — the audit doc is stale, not the code. Below that, the manual exploratory pass surfaced **7 issues that need decisions**: 2 likely product calls, 4 likely audit-doc updates, 1 likely real bug. Each finding includes a proposed direction so you can choose acceptance or pushback.

There is also a **new reusable audit runner** at `scripts/audit/` that turns most of `v1-browser-audit.md` into deterministic, re-runnable assertions. It currently encodes 14 checks; the rest of the audit file is mechanically extendable.

---

## How to reproduce / re-run

```bash
# One-time
npm i -g agent-browser
agent-browser install

# Each run
pnpm dev                                 # if dev panics, rm -rf apps/web/.next first
# In two separate terminals, launch Chromes with debug ports + isolated profiles:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/provost-admin-profile \
  http://localhost:3000 &
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9223 \
  --user-data-dir=/tmp/provost-member-profile \
  http://localhost:3000 &
# Sign in: 9222 = admin, 9223 = member.

# Run the suite
node scripts/audit/run-audit.mjs
# Output: docs/walkthrough/runs/<YYYY-MM-DD-HHmm>.md  +  .json
```

Full operator README: [`scripts/audit/README.md`](../../scripts/audit/README.md).

---

## Findings

Each finding has a **classification**:
- 🐛 **bug** — code does the wrong thing
- 📄 **stale audit** — code is fine, audit text is out of date
- ❓ **product call** — needs a decision before code or audit changes
- 🧪 **harness** — issue with how we drive the audit, not with Provost

---

### F-1 🐛/📄 `/governance` redirects admin users to `/`

**Symptom.** Robert (`family_users.role = "admin"`) navigating to `/governance` is hard-redirected to `/`. The audit (§13) says the route is "admin-only — member redirect," implying admin should reach it.

**Likely cause.** Commit `4ebb866 feat(admin): site-admin role + dedicated /(admin) UI for Library and Governance` introduced a separate `site_admin` role distinct from the family `admin` role and moved `/governance` behind it. Robert is a family admin but presumably not `site_admin = true` in our seed.

**Repro.**
```bash
# As Robert (port 9222)
agent-browser open http://localhost:3000/governance
agent-browser get url
# → http://localhost:3000/
```

**Proposed actions.**
1. **Decide the canonical access model** for `/governance`:
   - **Option A — site_admin only** (current behavior): update the audit text in §13 to read "site-admin only — both family admin and member redirect," and update the demo seed to mark Robert (or a dedicated test user) as `site_admin = true` so audits can exercise the page. Document the seed step in `docs/walkthrough/v1-browser-audit.md`.
   - **Option B — family_admin OR site_admin**: relax the route guard in `apps/web/src/app/(app)/governance/...` (or wherever the `/governance` group is gated) to allow `family_users.role === "admin"` as well. Keep audit text as-is.
2. Add the equivalent check for `/(admin)/library` and `/(admin)/governance` so we don't have parallel admin surfaces with different guards.
3. Add a one-line decision note to `docs/deploy/post-launch-audit.md` so this doesn't re-surface every audit.

**Owner suggestion.** Eng (auth/middleware), product confirm.

---

### F-2 ❓ `/signals` redirects all members — audit expects scoped visibility

**Symptom.** David (`family_users.role = "member"`) navigating to `/signals` is redirected to `/`. The sidebar Signals link is also hidden for members.

**Audit expectation (§1.2 / §5).**
> As member: signals visible match `member_ids[]` on each signal (rule-engine signals carry named members).

**Likely cause.** The `/signals` route (or the parent layout) appears to be guarded by a flat admin check rather than by query-time scoping on `signals.member_ids`. The Convex `signals.list` query likely *can* scope correctly, but the page never gets a chance to call it.

**Repro.**
```bash
# As David (port 9223)
agent-browser open http://localhost:3000/signals
agent-browser get url
# → http://localhost:3000/
```

**Proposed actions.**
1. Read `apps/web/src/app/(app)/signals/page.tsx` (and any layout above it) for the role guard.
2. **Pick the canonical model:**
   - **Option A — admin-only signals page** (current behavior): drop §1.2's "member sees scoped subset" expectation and §5's "as member not on `member_ids[]`: status update should fail with FORBIDDEN_RESOURCE_WRITE" — that latter check is moot if members can't reach the page at all. Add a sentence to §5 that says "Signals is admin-only; member-facing signal surfacing is via the home highlights cards." (Audit doc was likely written before the route guard tightened.)
   - **Option B — scoped member access**: remove the route guard, replace with query-time scoping in `convex/signals.ts:list` — `if (role === "member") filter to docs where member_ids.includes(currentUserId)`. Verify `signals.updateStatus` still rejects writes from non-`member_ids` members with `FORBIDDEN_RESOURCE_WRITE`.

**Owner suggestion.** Product to decide A vs B; eng to implement and update the audit.

---

### F-3 ❓/🐛 David's lesson content reads as emerging-phase, not operating-phase

**Symptom.** Audit (§2.1) lists David Williams as **operating** phase with 2 active lessons under the **Foundations** track of the **Operating Stewards** program. In reality, David's two active lessons are:

- "Needs vs Wants + Family Values in Money Decisions"
- "The Benefits of Higher Education"

And the lesson reader for the first one shows a slide titled **"The Three Buckets"**.

These titles read as youth/early-financial-literacy content, which would fit **emerging** or **developing** phase, not operating-phase governance content.

**Three possibilities, in decreasing likelihood:**
1. The seed sets David's `family_users.phase` to something other than `"operating"` (`"emerging"` / `"developing"`), and the audit doc has the wrong phase mapping for him.
2. The "Operating Stewards" program track was seeded with the wrong lesson set (mixed up with the emerging program).
3. David is correctly `"operating"`, but the lesson delivery query (`convex/lessonDelivery.ts`) is selecting from the wrong program.

**Proposed actions.**
1. Run `npx convex run --prod=false family:listMembers` (or the equivalent) and capture David's `phase` value.
2. If phase is not `"operating"`: update the audit doc to either pick a different operating-phase test member, or update David's phase in the seed.
3. If phase IS `"operating"`: read `convex/seed.ts` for which lessons are wired to which `programs` row, and `convex/lessonDelivery.ts` for the active-lessons query — there's a wiring bug.
4. Add a §2.1 sub-check to the runner that asserts the *lesson title text* belongs to the expected program, not just the count.

**Owner suggestion.** Eng to investigate (~30 min).

---

### F-4 📄 Sidebar nav doesn't match audit expected list

**Symptom.** Audit §0 expects:
> Home, Family, Documents, Library, Lessons, Signals, Simulations, Governance, Professionals (or "Our Team"), Messages, Events, Assets, Legacy, Settings

Reality (Robert, admin):
> Highlights, Messages, Events, Assets, Signals, Simulations, Documents, Lessons, **People** (`href="/family"`), Legacy, Settings — **11 items**.

Notably:
- **"Family" → renamed to "People"** in the sidebar; route is still `/family`.
- **"Library"** is not a sidebar item (route `/library` is presumed to still work, untested in this run).
- **"Governance"** is not a sidebar item (consistent with F-1's site_admin gate).
- **"Professionals" / "Our Team"** is not a sidebar item, but `/professionals` deep-links cleanly to a page titled "Our Team" with Internal/External tabs.
- **"Home"** is implicit (`/` = "Highlights" link).

**Proposed actions.**
1. Update `docs/walkthrough/v1-browser-audit.md` §0 to reflect actual sidebar inventory:
   - Replace "Home, Family, …" with the real ordered list.
   - Note that Library, Governance, Our Team, and Messages-as-direct-link are reachable by URL but absent from the sidebar (or, if Messages is in the sidebar, confirm).
2. **Or** (product decision): add the missing items back to the sidebar so the audit's ideal list is also the shipped UX. Recent commit `c04e967 feat(web): vibe-coding polish — hamburger/surname header, sidebar reorder, People page, stub routes` suggests an intentional reorder — confirm whether "Library" / "Our Team" / "Governance" sidebar entries were dropped on purpose.

**Owner suggestion.** Product, then doc owner.

---

### F-5 📄 Header reads "Williams", not "Williams Family (demo)"

**Symptom.** Sidebar/header shows just `Williams`. Audit §0 expects `Williams Family (demo)`.

**Likely cause.** Commit `c04e967` mentions "surname header" — the header was intentionally simplified to surname-only. The seed `family.display_name` may still be `Williams Family (demo)` but the header component truncates / uses `family.surname`.

**Proposed actions.**
1. Update audit §0 expected text to `Williams`.
2. Or, if the full name is wanted on hover or in a popover, confirm where it lives so the audit can validate that surface instead.

**Owner suggestion.** Doc owner.

---

### F-6 ❓ Document category tabs render 3, audit lists 5

**Symptom.** Audit §3.1 expects category tabs `all / estate / tax / legal / financial`. `/documents` actually renders **3 tabs**: `All documents`, `Estate Plan Documents`, `Financial statements`.

**Likely cause.** The category tab list is dynamically generated from non-empty document categories — the dev seed has no `tax` or `legal` documents.

**Proposed actions.**
1. **If "tabs only render when non-empty" is intentional**: update audit §3.1 to "tabs render for each non-empty category present in the seed; with current seed, expect at least All / Estate Plan Documents / Financial statements."
2. **If audit's static list was the original intent**: render all 5 tabs unconditionally with empty-state messaging.

This is a low-stakes UX call but worth pinning so the audit stops flagging it.

**Owner suggestion.** Product confirm; doc owner update.

---

### F-7 📄 Audit expects 4 signals; admin sees 3 cards labeled "REVIEW REQUIRED"

**Symptom.** Audit §5 says `/signals` lists 4 demo signals. Robert sees a `Signals` page with 3 cards under "REVIEW REQUIRED (3)".

**Possibilities.**
1. The 4th signal exists but is in a non-default status (e.g., `resolved`, `drafting`) — needs a different tab/filter to surface.
2. Seed actually only writes 3 signals.
3. One signal lacks the data the card needs and is silently filtered.

**Proposed actions.**
1. `npx convex run --prod=false signals:list familyId=<williams_family_id>` to dump the row count + statuses.
2. If row count is 4: confirm the page has all-status filters and update audit §5 to specify which filter to apply.
3. If row count is 3: update audit §5 expected count.

**Owner suggestion.** Eng (5-min check).

---

### F-8 🧪 Harness gotchas (already mitigated, documented for future operators)

These caused real time loss in this audit run; the runner script now defends against all of them. Documenting so the coding agent doesn't trip over them in subsequent audit work.

1. **Don't combine `agent-browser --session <name>` with `--cdp <port>`.** The daemon wedges silently — every command times out with no error output. Use a single default session and swap with `agent-browser close` + `agent-browser connect <port>`.
2. **Stale daemon socket files cause silent hangs.** After `pkill -9 agent-browser-darwin-arm64`, you must `rm -f ~/.agent-browser/*.{pid,sock,stream,version,engine}` before reconnecting. The runner does this automatically; manual workflows must do it explicitly.
3. **Never use `agent-browser wait --load networkidle` on Provost.** Convex websockets keep the network active indefinitely; `networkidle` never fires and the daemon hangs the entire session.
4. **Hydration race on every `agent-browser open`.** The command returns at DOM commit, but Clerk auth + Convex queries hydrate after that. Naive `eval` reads logged-out skeletons (`Hi, there` greeting, 0 documents, no `$92.4M` total). Always wait for at least URL settle + `Hi, there → Hi, <name>` + innerText length stable across two polls (~250–500ms). The runner implements this in `navigate()`.
5. **Next 16 + Turbopack panic on stale `.next` cache.** If `pnpm dev` reports `Every task must have a task type TaskGuard { ... }` panics, kill, `rm -rf apps/web/.next`, restart. The dev server appears to listen on port 3000 but every request hangs because worker threads are panicking.

---

## Items NOT covered by this audit run (deferred backlog)

The runner currently encodes §0/§1/§2.1/§2.2/§2.3/§3.1/§3.2/§8/§11/§13. The following items from `v1-browser-audit.md` are not yet automated. Each maps to 1–3 new entries in `scripts/audit/checks.json`:

- §1.3 audit log inspection (admin /governance — gated by F-1)
- §1.4 backend `acl:listParties` — needs `npx convex run` integration in the runner
- §2.4 Programs tab content (4 programs, "Operating Stewards" expand to "Foundations" with 11 lessons)
- §2.5 Progress tab table (one row per family member, expected counts)
- §2.6 Quiz backend smoke
- §3.3 Document versioning dropdown
- §4 Family graph (ReactFlow, layer toggles, member ACL scoping on the graph)
- §5 Signals detail + status mutation (depends on F-2 outcome)
- §6 Simulations / Waterfall — modal interactions
- §7 Library — search + tag facets
- §9 Messages — needs Convex-dashboard side actions
- §10 Events — same
- §11 Internal tab via `professionals:setEmploymentRole`
- §12 Chat panel + prompt suggestion chips
- §14 Agent tools surface (most of these need a wired chat thread; chat rail is currently using a stub)
- §15 Status page, Sentry, rate limit
- §16 Known gaps — confirm they still behave as documented
- §17 Non-functional (responsive, dark mode, keyboard nav)

**Recommendation:** prioritize §3.3 (versioning), §4 (graph + ACL scoping on graph), and §15 (rate limit, status page) for the next runner pass — they're the highest-value items still unautomated.

---

## Suggested resolution order for the coding agent

1. **F-1** `/governance` decision — unblocks audit §13 + future site-admin testing. (~30 min)
2. **F-3** David's phase / lesson wiring — likely a one-line seed fix. (~15 min)
3. **F-2** `/signals` member access policy — biggest product question; whichever way it goes, aligns audit + code. (~1 hr)
4. **F-7** Signal count discrepancy — confirm seed output. (~10 min)
5. **F-4 / F-5 / F-6** — audit doc updates once the above land. (~30 min)
6. Extend `checks.json` to cover the deferred backlog above. (~half day for the high-value subset)

---

## Files produced or changed by this audit pass

| File | Status | Purpose |
|---|---|---|
| `scripts/audit/run-audit.mjs` | new | Runner, ~280 LoC, no extra deps |
| `scripts/audit/checks.json` | new | Declarative check spec (14 checks today) |
| `scripts/audit/README.md` | new | Operator runbook |
| `docs/walkthrough/runs/2026-04-24-dry-run.md` | new | Manual exploratory pass — context for findings F-1 through F-7 |
| `docs/walkthrough/runs/2026-04-25-03-33.md` + `.json` | new | First clean automated run — 23/24 pass |
| `docs/walkthrough/v1-browser-audit.md` | unchanged | Source-of-truth checklist; needs updates per F-4/F-5/F-6/F-7 |

No production code changed. All findings are observations or test infrastructure.

---

## Open questions for the coding agent

1. Is the `site_admin` role intended to be the only path to `/governance`, or should family `admin` also reach it?
2. Should `/signals` be admin-only, or should members see scoped signals?
3. Is "People" the final name for the Family page, and is the audit doc's older name list out of date?
4. Are the missing sidebar entries (Library, Our Team, Governance) intentional sidebar omissions or pending re-adds?
5. Is the "tabs only for non-empty categories" pattern on `/documents` the design intent?
6. Is David's phase actually `operating` per seed, or is the audit doc wrong?

---

## Appendix A — Raw automated run output (2026-04-25 03:33 UTC)

Verbatim from `docs/walkthrough/runs/2026-04-25-03-33.md`. Source JSON for the same run is at `docs/walkthrough/runs/2026-04-25-03-33.json`.

**Base URL:** http://localhost:3000
**Total:** 24  ·  **Pass:** 23  ·  **Fail:** 1  ·  **Error:** 0

### §0 Smoke

| Check | Session | Result | Actual |
|---|---|---|---|
| 0.1-home-loads Home page loads without redirect | robert | ✅ | `{"title":"Provost","url":"/"}` |
| 0.2-no-page-errors No JS errors on home | robert | ✅ | `""` |
| 0.3-greeting-personalized Greeting matches user first name | robert | ✅ | `"Hi, Robert"` |
| 0.4-sidebar-key-routes Sidebar links to /lessons and /documents (both roles); /assets and /signals only for admin | robert | ✅ | `{"assets":true,"documents":true,"lessons":true,"signals":true}` |
| 0.1-home-loads Home page loads without redirect | david | ✅ | `{"title":"Provost","url":"/"}` |
| 0.2-no-page-errors No JS errors on home | david | ✅ | `""` |
| 0.3-greeting-personalized Greeting matches user first name | david | ✅ | `"Hi, David"` |
| 0.4-sidebar-key-routes Sidebar links to /lessons and /documents (both roles); /assets and /signals only for admin | david | ✅ | `{"assets":false,"documents":true,"lessons":true,"signals":false}` |

### §1 Tenant isolation

| Check | Session | Result | Actual |
|---|---|---|---|
| 1.1-documents-count /documents shows 12 docs (dev seed-shares mode) | robert | ✅ | `12` |
| 1.2-assets-admin-only /assets — admin loads, member redirects | robert | ✅ | `"/assets"` |
| 1.3-signals-admin-only-current /signals — admin loads (member redirect — surprise vs audit) | robert | ✅ | `"/signals"` |
| 1.1-documents-count /documents shows 12 docs (dev seed-shares mode) | david | ✅ | `12` |
| 1.2-assets-admin-only /assets — admin loads, member redirects | david | ✅ | `"/"` |
| 1.3-signals-admin-only-current /signals — admin loads (member redirect — surprise vs audit) | david | ✅ | `"/"` |

### §2 Learning

| Check | Session | Result | Actual |
|---|---|---|---|
| 2.1-lessons-active-count Active lessons by phase | robert | ✅ | `0` |
| 2.2-no-forbidden-pill-text No 'Assigned'/'Overdue'/'Due [date]' pill text on /lessons | robert | ✅ | `{"assigned":false,"dueDate":false,"overdue":false}` |
| 2.3-lesson-tabs-by-role Lesson tabs: admin sees Programs/Progress, member does not | robert | ✅ | `["My Lessons","Bookmarks","Programs","Progress"]` |
| 2.1-lessons-active-count Active lessons by phase | david | ✅ | `2` |
| 2.2-no-forbidden-pill-text No 'Assigned'/'Overdue'/'Due [date]' pill text on /lessons | david | ✅ | `{"assigned":false,"dueDate":false,"overdue":false}` |
| 2.3-lesson-tabs-by-role Lesson tabs: admin sees Programs/Progress, member does not | david | ✅ | `["My Lessons","Bookmarks"]` |

### §8 Assets

| Check | Session | Result | Actual |
|---|---|---|---|
| 8.1-assets-total Total assets = $92,400,000 (admin) | robert | ✅ | `"$92,400,000"` |
| 8.2-asset-filter-chips Filter chips: All / Brokerage / Private Equity / Real Estate / Checking / Entities | robert | ✅ | `["All","Brokerage","Private Equity","Real Estate","Checking","Entities"]` |

### §11 Professionals

| Check | Session | Result | Actual |
|---|---|---|---|
| 11.1-our-team-page /professionals heading is 'Our Team' with Internal/External tabs | robert | ✅ | `{"hasHeading":true,"tabs":["Internal","External"]}` |

### §13 Governance

| Check | Session | Result | Actual |
|---|---|---|---|
| 13.1-governance-admin-route /governance — admin can access (FAILS today; site_admin gate) | robert | ❌ | `"/"` |

---

## Appendix B — Raw exploratory dry-run notes

Full exploratory pass at `docs/walkthrough/runs/2026-04-24-dry-run.md`. The findings F-1 through F-7 above are the synthesis of those notes; the dry-run file contains the per-page surveys (sidebar enumerations, dollar-value extraction from `/assets`, lesson title strings for David, signal heading counts, etc.) that backed each finding. Read it if you want the raw evidence before accepting any finding.
