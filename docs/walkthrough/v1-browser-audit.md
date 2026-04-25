# Provost v1 — Browser Audit Checklist

**Purpose:** validate every feature shipped in the recent v1 build by clicking through the dev app as multiple users. Hand this to a tester (human or agent) and have them work top to bottom.

**Environment**
- Convex dev deployment: `decisive-minnow-878`
- `ACL_PARTY_CHECK_ENABLED=true` on dev
- Demo data: 1 family ("Williams Family (demo)"), 12 members spanning 4 stewardship phases, 11 lessons under an "Operating" program, 7 assets totaling $92.4M, 3 signals (rule-engine output), 12 documents, 3 external professionals.
- Seed content note: the 11 legacy lessons all sit under the Operating program's "Foundations" track because the P0b migration parks all pre-existing lessons there. The lesson *content* is early-financial-literacy (Three Buckets, college selection, intro investing) — phase-mapped lessons authored per stewardship tier are a curriculum-authoring task tracked separately. Don't flag the phase ↔ content mismatch as a bug.
- Frontend: `pnpm dev` in repo root, then sign in with a Clerk test account that's been linked to a seeded Williams member via `/(admin)` claim flow.
- For ACL testing you need at least two test accounts — one in the **admin** role and one **member** role. If only one account is wired up, mark member-side checks as "deferred" rather than guessing.

**How to record results**

For each item, mark one of:
- ✅ Works as described
- ⚠️ Partially works (note what's off)
- ❌ Broken (note what failed and any console error)
- ⏭️ Skipped (note why — e.g. no second account, no quiz-passed state yet)

Add a "Notes" line under any item that's not ✅.

**Harness gotchas (from prior runs, see audit findings F-8):**
- Don't combine `agent-browser --session <name>` with `--cdp <port>` — the daemon wedges silently. Use a single default session and swap with `agent-browser close` + `agent-browser connect <port>`.
- After `pkill -9 agent-browser-darwin-arm64`, also `rm -f ~/.agent-browser/*.{pid,sock,stream,version,engine}` before reconnecting.
- Never `agent-browser wait --load networkidle` on Provost — Convex websockets keep the network active indefinitely; the daemon hangs.
- Hydration race: every `open` returns at DOM commit, before Clerk + Convex hydrate. Always wait for at least URL settle + greeting personalization (`Hi, there → Hi, <name>`) + innerText length stable across two polls (~250–500ms).
- If `pnpm dev` panics with `Every task must have a task type TaskGuard`, kill it, `rm -rf apps/web/.next`, restart. Stale Turbopack cache.

---

## 0. Smoke

- [ ] App loads at `/` after sign-in without errors in browser console.
- [ ] Header shows the family surname only — for the demo, just **"Williams"** (not the full "Williams Family (demo)" name; the header is intentionally surname-only).
- [ ] Sidebar shows the production set of nav items (order may vary by role): **Highlights, Messages, Events, Assets, Signals, Simulations, Documents, Lessons, People, Legacy, Settings**. Notes:
  - "People" is the renamed Family page (route still `/family`).
  - **Library, Governance, and Our Team / Professionals are intentionally absent from the sidebar.** They are reachable only by direct URL: `/library` and `/governance` are site-admin curation surfaces (under the `(admin)` route group); `/professionals` deep-links to the "Our Team" page.
  - Member roles see fewer items — Assets/Signals/Simulations admin-tier items hide; Signals is now visible to members per F-2 (it scopes by `member_ids[]`).
- [ ] Browser console shows no red errors during navigation between pages.

---

## 1. Tenant isolation (P0a)

These checks need a **Williams member** account (no bypass) and a **Williams admin** account (bypass).

### 1.1 Cross-family hard isolation
- [ ] As any user, attempt to navigate to a URL with a Williams document id while signed in as no one (signed out): redirect to sign-in.
- [ ] If a second seeded family exists, signing in as a member of family A and trying URLs with family B ids must return "not found"/error, never leak data. (Skip if only one family seeded.)

### 1.2 Member ACL — visibility scoping
- [ ] As a Williams **admin**: `/documents` shows all 12 documents.
- [ ] As a Williams **member** (subject to ACL): `/documents` shows only documents that have a `resource_parties` row for that user. With current dev seed (`seedDevShares`), members see all 12. **Note:** this matches the dev-only "everybody is a party" mode; if seedDevShares hasn't been re-run, members will see 0 documents — that's the production behavior, not a bug.
- [ ] As admin: `/signals` shows the full set (3 today).
- [ ] As member: `/signals` is now reachable (see §5 access model) and shows only signals where the member is in `member_ids[]`.

### 1.3 Audit trail
- [ ] As **site-admin**, open `/governance` (it's site-admin-only — see §13). Audit log shows recent activity.
- [ ] Try a write you should not be allowed to do (e.g., as a member, call `signals.updateStatus` for a signal you're not in `member_ids[]` of). Confirm a `FORBIDDEN_RESOURCE` (party check) error is surfaced; check `/governance` audit log for the failure.

### 1.4 Stage 4 — party management mutations
- [ ] Backend-only check (run via `npx convex run`): `acl:listParties` for a known document returns at least one `owner` row.

---

## 2. Learning system (P0b)

### 2.1 My Lessons (default tab)
- [ ] As an **operating-phase** member (David, Susan, Jennifer, or Michael Reynolds): `/lessons` shows exactly **2 active lessons**.
- [ ] As a **non-operating** member (e.g. Robert/Linda — enduring; the children — emerging/developing): `/lessons` shows **0 active lessons** (their phases have empty programs by design).
- [ ] Status pill on lesson cards reads "Up next" — never "Assigned" or "Overdue" or "Due [date]".
- [ ] No "due date" string anywhere on the lessons page. (The PRD explicitly forbids this language.)

### 2.2 Lesson reader (legacy slideshow path)
- [ ] Click an active lesson card → routes to `/lessons/[id]`.
- [ ] Reader displays without console errors. (Reader is the existing slideshow component — Medium-style article rewrite is a known follow-up.)
- [ ] Browser back returns to `/lessons` with the same active tab selected.

### 2.3 Bookmarks tab
- [ ] As a member, the Bookmarks tab is visible.
- [ ] Empty state: "No bookmarks yet." text appears initially.
- [ ] Bookmark mutation `api.bookmarks.toggle` works via dev tools or chat (UI button in the reader is a follow-up — confirm the mutation succeeds via Convex dashboard).

### 2.4 Programs tab (admin/advisor only)
- [ ] As **admin**, "Programs" tab is visible; as **member**, it is not.
- [ ] Programs tab shows 4 programs (Emerging, Developing, Operating, Enduring) for the Williams family.
- [ ] Click "Operating Stewards" — expands to show "Foundations" track with 11 lessons.
- [ ] Other 3 programs expand to empty track lists. (Expected per migration: only Operating program got the legacy lessons.)

### 2.5 Progress tab (admin/advisor only)
- [ ] As **admin**, "Progress" tab is visible; as **member**, it is not.
- [ ] Table renders one row per family member with name, role, phase, active count, completed count, total.
- [ ] Operating-phase members show `active=2, completed=0`.
- [ ] Non-operating members show `active=0, completed=0`.

### 2.6 Quiz flow
- [ ] Backend-only smoke: `npx convex run quizzes:getForLesson lessonId=<an active lesson id>` returns a quiz with 3 questions and `pass_score: 0.7`.
- [ ] No frontend UI yet for taking the quiz — confirm via Convex dashboard or skip with note.

---

## 3. Documents

### 3.1 List + filter
- [ ] `/documents` loads the 12 demo documents.
- [ ] Category tabs render only for non-empty categories present in the seed. Today the seed has Estate Plan and Financial Statement docs, so expect tabs roughly: **All documents, Estate Plan Documents, Financial statements**. (The static 5-tab list — all/estate/tax/legal/financial — only applies once the seed adds tax/legal documents.)
- [ ] Document cards link into detail view.

### 3.2 Detail view
- [ ] PDF viewer renders for documents with attached files.
- [ ] Page navigation (Prev/Next) works when pages are present.
- [ ] Observations panel on the right shows AI-flagged observations.
- [ ] "Mark as done" / "Mark as read" on observations works.

### 3.3 Document versioning (P3.3)
- [ ] If no parent-version data is seeded yet, the version dropdown should NOT appear (only renders when versions.length > 1).
- [ ] To smoke-test: insert a second `documents` row via Convex dashboard with `parent_document_id` pointing to an existing doc. Reload the parent's detail page. Dropdown should appear with two entries sorted by `version_date`.
- [ ] Switching the dropdown navigates to the other version's detail page.

---

## 4. Family graph

- [ ] `/family` loads ReactFlow graph.
- [ ] Layer toggles (people / documents / signals / professionals) flip respective nodes on and off.
- [ ] As a **member** (ACL-scoped): graph shows fewer document/signal nodes than admin sees, matching access-scoped subset.
- [ ] Detail panel opens on node click; member info displays.
- [ ] Waterfall modal opens from family graph context.

---

## 5. Signals

**Access model:** `/signals` is open to all family roles. Admins/advisors/trustees see every signal in the family; members see only signals where they appear in `member_ids[]` (the rule-engine seeds party rows for each named member). Member writes via `signals.updateStatus` go through `requireResourceAccess` and reject with `FORBIDDEN_RESOURCE` for signals the member isn't a party on.

- [ ] `/signals` lists the 3 rule-engine signals currently produced by the seed. (Dev seed runs `signals.generateFromRules` against the Williams data — actual count tracks rule output, not a fixed number. Update the audit if seed output drifts.)
- [ ] Severity / category badges render.
- [ ] Status filter works (open / drafting / resolved / etc).
- [ ] Click a signal → detail panel.
- [ ] As **admin**: sees all signals; can change status via `signals.updateStatus`.
- [ ] As **member** named in a signal's `member_ids[]`: signal appears in the list, detail loads, status update via `signals.updateStatus` succeeds.
- [ ] As **member** NOT named in a signal: signal is filtered out of the list; direct call to `signals.updateStatus` for that signal id should fail with `FORBIDDEN_RESOURCE` (party check) or return `null` (because `getSignal` soft-fails for non-parties).

---

## 6. Simulations / Waterfall

- [ ] `/simulations` lists saved scenarios (likely 0 in dev).
- [ ] "New simulation" or equivalent opens the waterfall modal.
- [ ] Revisions toggles (fundRevocable, ilit, buysell, portability, qtip) update the diagram.
- [ ] Custom edits (childrenPct, trustBFunding, deathOrder) update the diagram.
- [ ] "Save scenario" persists to `waterfalls` table — confirm via Convex dashboard.
- [ ] Saved scenario shows up in the list after save.

---

## 7. Library

- [ ] `/library` loads.
- [ ] Search input filters results.
- [ ] Tag facet filters (domain, artifact_type, complexity, functional_use, risk) apply.
- [ ] Click a source → detail view shows full content.
- [ ] Library sources with `family_id=null` (global) are accessible to authed users; family-scoped sources require family membership.

---

## 8. Assets (P1.1)

- [ ] `/assets` loads (admin/advisor/trustee only).
- [ ] As a plain **member**, navigation to `/assets` redirects (role guard).
- [ ] Summary header shows total: **$92,400,000** for Williams demo.
- [ ] Per-type cards show breakdown: Brokerage / Private Equity / Real Estate / Checking / Entities.
- [ ] List below shows 7 rows with name, type, as-of-date, value.
- [ ] Type filter chips (All / Brokerage / Private Equity / Real Estate / Checking / Entities) filter the list correctly.
- [ ] Currency formatted as `$NN,NNN,NNN`.

---

## 9. Messages (P1.2)

### 9.1 Empty state
- [ ] As a fresh test user, `/messages` Inbox tab shows "No conversations yet."
- [ ] Drafts tab shows "No drafts."
- [ ] Sent tab shows "No sent messages."

### 9.2 Send a message (via Convex dashboard, since compose UI is deferred)
- [ ] Run `messages:sendMessage` from Convex dashboard with `familyId`, `recipientUserIds: [<another-member>]`, `subject: "Hello"`, `body: "Test"`.
- [ ] As recipient, refresh `/messages` Inbox. Thread appears with unread badge "1".
- [ ] Click the thread → ThreadView shows the message with sender name and timestamp.
- [ ] Reply via the textarea + Send button. Sent successfully.
- [ ] Reload as the original sender — Inbox shows the reply with unread badge.
- [ ] Open the thread → both messages render with chat-bubble alignment (mine on right, theirs on left).
- [ ] Closing and reopening the thread no longer shows unread badge (markThreadRead fires on open).

### 9.3 ACL verify (admins do NOT bypass for messages)
- [ ] As a Williams **admin who is NOT a participant** in a thread, attempt to call `messages:getThread` with that thread id via Convex dashboard. Must throw `MESSAGE_FORBIDDEN`.

---

## 10. Events (P1.3)

### 10.1 Empty state
- [ ] `/events` Calendar tab shows "No events scheduled."
- [ ] List tab shows the same empty state.

### 10.2 Create an event (via Convex dashboard)
- [ ] Run `events:create` from dashboard with `familyId`, `title: "Annual planning"`, `startsAt`/`endsAt`, `locationType: "video"`, `attendeeUserIds: [<2-3 member ids>]`.
- [ ] Refresh `/events`. Calendar tab shows the event grouped under its day. List tab shows it as a row.
- [ ] As a recipient, run `events:rsvp` with `status: "yes"`.
- [ ] As a different recipient, run `events:rsvp` with `status: "no"`.
- [ ] `events:get` returns the event with `myRsvp` matching what each user submitted.

---

## 11. Professionals / Our Team (P3.5)

- [ ] `/professionals` is now titled "Our Team".
- [ ] Two tabs: Internal / External (default tab is External).
- [ ] External tab shows the 3 demo professionals (Mike Harrington / Sarah Lin / David Johnson).
- [ ] Internal tab shows empty state ("No internal team members yet…") because no `family_users.employment_role` is set in the demo.
- [ ] To smoke-test Internal: run `professionals:setEmploymentRole` from Convex dashboard with a Williams admin user and `employmentRole: "Family Office Director"`. Reload Internal tab — that user appears with the badge.

---

## 12. Chat panel + prompt suggestions (P3.1)

- [ ] Floating chat rail opens via header chat toggle.
- [ ] Chat input shows on the right side.
- [ ] Initial render on a known route (e.g. `/family`): waits ~1s then renders 3-4 suggestion chips above the textarea.
- [ ] Chips are page-contextual (different prompts on `/family` vs `/documents` vs `/lessons`).
- [ ] Clicking a chip populates the textarea with that prompt and focuses the input.
- [ ] Once you type any character, chips disappear.
- [ ] Clearing the textarea makes chips reappear.
- [ ] Send a message → reply streams from agent (this is end-to-end agent flow; if the chat rail still uses stub thread, expect no real reply — known gap, see #33).

---

## 13. Governance (admin-only)

- [ ] `/governance` is **site-admin-only** — both family admin (Robert) and family member (David) hard-redirect to `/`. Test by signing in as a `users.is_site_admin = true` account; the page shell renders via the `(admin)` layout (admin sidebar + family picker), not the family shell. To grant site-admin in dev: `npx convex run users:promoteSiteAdmin '{"email":"...","value":true}'`.
- [ ] Audit Log tab paginates recent events.
- [ ] Approvals tab lists pending tool-call approvals (likely 0).
- [ ] Tasks tab lists open tasks (likely 0).
- [ ] Compliance settings tab toggles update via `compliance:setPreference`.

---

## 14. Agent tools surface

Check via the chat panel (or directly via Convex dashboard if chat is stubbed):

- [ ] **navigate** — agent can route the user to a path.
- [ ] **render_family_graph** — opens family page focused on a node.
- [ ] **render_waterfall_simulation** — opens waterfall modal.
- [ ] **explain_document** — returns plain-language explanation.
- [ ] **search_knowledge** — returns hits across docs/lessons/library; respects per-user ACL (member sees fewer hits than admin if scoped).
- [ ] **search_library** — returns library matches.
- [ ] **list_observations** — returns active observations.
- [ ] **draft_revision** — approval-gated; shows a pending approval card.
- [ ] **create_task** — approval-gated; creates task on approve.
- [ ] **invite_member** — approval-gated.
- [ ] **remember** — approval-gated; adds a `family_memories` row.
- [ ] **summarize_lesson** — returns 3-5 bullets.
- [ ] **recommend_lesson** (P0b NEW) — surfaces a lesson card with optional reason; does NOT change delivery state.
- [ ] **assign_lesson** (DEPRECATED) — should rarely be picked because description steers the LLM to recommend_lesson; if it is picked, still resolves but log a note.

---

## 15. Operational pieces

- [ ] `/status` public page loads without auth and shows commit metadata (if `COMMIT_SHA` env is set).
- [ ] Sentry receives an error if you intentionally throw in a dev page (skip if you don't want to pollute Sentry).
- [ ] Rate limit: spam the chat send button > 20 times in 60s — should hit `RATE_LIMIT` error from `run.start:user`.

---

## 16. Known gaps (do NOT mark these as failures)

These are tracked as follow-ups, not bugs. Confirm they behave as documented below:

- **Compose-new-thread UI in Messages:** no UI to start a fresh DM. Only replies in existing threads + dashboard-triggered sends work.
- **Asset add form:** no UI to add new assets in browser. `assets:create` works via dashboard.
- **Event create form:** same — `events:create` via dashboard only.
- **Medium-style lesson reader:** still using the legacy slideshow component. PRD article layout pending content shape change.
- **Full-screen chat mode:** not built. Floating-only today; ChatRail uses a stub thread, so chat panel does not currently show real conversation history. If "send" produces nothing visible, that's why.
- **Globals in `library.listSources`:** family-scoped queries currently exclude `family_id=null` rows by design. Open question for product whether family members should also see global library content.
- **Convex test harness (`convex-test`):** not installed. Verification was inspection + diagnostic queries; no automated regression suite yet.
- **Multi-family backfill for `professionals.family_id`:** dev has 1 family so backfill auto-assigned. Production with >1 family will need a manual op.
- **Wealth Flow multi-agreement selector:** still single-scenario. Awaiting product call on aggregation rules.

---

## 17. Quick non-functional checks

- [ ] Page loads under ~1s on warm cache.
- [ ] Chat first-token under ~3s when chat is wired (skip if stub).
- [ ] Mobile viewport (Chrome dev tools, iPhone 14 Pro): pages render without horizontal scroll. Sidebar may collapse — that's expected.
- [ ] Dark mode (if present in profile dropdown): toggling doesn't break layout.
- [ ] Keyboard tab order on the lessons page is sane (visible focus rings on tabs and lesson cards).

---

## 18. Reporting back

When the auditor finishes, ask them to write a single summary at the end of this file:

- **Pass count:** N of M items
- **Critical failures:** list any ❌
- **Surprises:** list any unexpected behavior even if it's technically passing
- **Recommended next priorities:** their top 3 from the gaps in §16 to tackle next

That summary becomes the input for the next round of work.
