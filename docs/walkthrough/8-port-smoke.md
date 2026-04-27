# 8-Port Browser Smoke Plan

This is a self-contained walkthrough for a browser-driving agent (or a human)
to verify the eight features ported from the external repo. Run end-to-end on
the deployed Vercel preview after this branch's CI clears, OR locally against
`localhost:3000` with `npx convex dev` + `pnpm --filter @provost/web dev`
running.

**Test accounts (dev env, Convex deployment `decisive-minnow-878`):**
- `allanbcrawford@gmail.com` — site admin (no family memberships).
- A Williams family admin (set up earlier in the project).
- `david.williams@provostdemo.com` — Williams family member.

If the second/third accounts are unavailable, the agent can skip member-only
checks and call them out explicitly in the report.

---

## #1 — Layered system prompt

**Goal:** confirm the chat agent's first reply on a detail page references
the entity by name, and that tone shifts with the user's stewardship phase.

**Steps:**
1. Sign in as a Williams family admin.
2. Navigate to `/documents` and click any document (e.g. "Last Will and
   Testament of Robert James Williams").
3. Open the floating chat panel. Send: "What's this document?"
4. **Expect:** the response references the document by name explicitly,
   not generically. (The page-context fragment carries `documentName` /
   `documentType` into the prompt.)
5. Navigate to `/lessons`, open any lesson, ask: "Summarize this for me."
6. **Expect:** a phase-appropriate summary. For a member with
   `stewardship_phase: "operating"`, the answer should be brief and
   strategic; for `"emerging"`, it should include definitions.

**Pass criteria:** the agent's first sentence references the on-page entity
by name AND the tone matches the active stewardship phase.

---

## #2 — Member lifecycle states

**Goal:** verify the new lifecycle column + admin dropdown + suspension gate.

**Steps:**
1. As Williams admin, navigate to `/family` and switch to the list view.
2. **Expect:** every row shows the member's name. Pending/invited members
   show a grey pill badge; active members show no badge; dormant amber;
   suspended red.
3. Pick a non-admin member with status `active`. From the dropdown beside
   their name, set status to `suspended`. Confirm the dialog.
4. **Expect:** the row's badge updates to red "Suspended" without a page
   reload.
5. Sign out. Sign in as that suspended member (if you have their creds; if
   not, simulate by hitting any family-scoped query as them via the Convex
   dashboard).
6. **Expect:** the app rejects the load with `FORBIDDEN_SUSPENDED`.
7. Sign back in as admin, restore the member to `active`.

**Pass criteria:** state pill updates inline, suspension blocks family-scoped
access, restoration unblocks.

---

## #3 — Asset snapshots + trend chart

**Goal:** verify the snapshot row writes on create/update + the trend chart
renders + YTD calculation.

**Steps:**
1. As Williams admin, navigate to `/assets`.
2. **Expect:** above the asset list, a "Wealth over time" chart card. With
   only one snapshot per asset, the chart will show the empty-state
   "appears once we have at least two snapshots".
3. Click "Add asset" → fill in name "Smoke Test Asset", type "Brokerage",
   value 1000000, currency USD, today's date. Submit.
4. **Expect:** asset appears in the list AND a snapshot row gets written
   for today (verify in Convex dashboard: `asset_snapshots` table should
   have a fresh row with `captured_by: "mutation"`).
5. From the Convex dashboard, manually backdate one snapshot's
   `snapshot_date` to Jan 1 of this year. Refresh the page.
6. **Expect:** the chart renders a line from Jan 1 to today, with a YTD %
   change badge next to the title. Sign of the % matches whether today's
   total is higher than Jan 1's total.

**Pass criteria:** snapshot row appears on every mutation, chart renders
with at least 2 points, YTD math is correct.

**Note for browser-only agents:** if you can't manipulate the Convex
dashboard, just verify the chart's empty state message renders correctly
("Trend chart appears once we have at least two snapshots") and that the
"Add asset" flow still works.

---

## #4 — FeatureGate component

**Goal:** verify gated routes render either content or a "Launching soon"
overlay based on flag state.

**Steps:**
1. Sign in as any user. Navigate to `/settings`.
2. **Expect:** a "Launching soon" card centered in the page (the `settings`
   flag was seeded with `enabled: false`).
3. As site-admin, additionally see a small badge at the bottom of the
   overlay: "settings · disabled globally".
4. Navigate to `/legacy`.
5. **Expect:** same launching-soon overlay, with badge reading
   "legacy · disabled globally" for site-admins.
6. From the Convex dashboard (or via `npx convex run featureFlags:toggleGlobal '{"key":"settings","enabled":true}'`), enable the `settings` flag. Refresh.
7. **Expect:** `/settings` now renders its actual content (a header +
   description) instead of the overlay.
8. Toggle it back off.

**Pass criteria:** flag toggle controls visibility live; no page reload
required beyond the standard Convex live-query refresh.

---

## #5 — Bento dashboard

**Goal:** verify the dashboard tiles render in a dense bento layout, with
no orphan gaps when conditional tiles are hidden.

**Steps:**
1. Navigate to `/` (home / Highlights).
2. **Expect:** a 2-column grid of tiles at desktop width. AssetsCard
   spans 2 rows; YearReviewCard, ActivityCard, LessonsCard each span 2
   rows; smaller tiles (TaxLawCard, LiquidityCard, EventsCard,
   MessagesCard) take a single row.
3. As an advisor or admin, if there are signals in `pending_review`
   state, a "Awaiting review" tile (amber) should appear in the next
   available slot — the `grid-auto-flow: dense` setting backfills any
   gap a tile leaves.
4. Resize the window to 375px. **Expect:** single column; all tiles
   stack vertically.
5. Resize to 768px and 1280px. **Expect:** 2-column grid at both
   breakpoints, no overflow, no orphan tiles.

**Pass criteria:** tiles render, breakpoints behave, the new
`PendingReviewCard` only appears when there's something to review.

---

## #6 — Events calendar/list dual-view

**Goal:** verify the pill toggle + localStorage persistence + month grid
+ click-empty-day-to-create.

**Steps:**
1. Navigate to `/events`.
2. **Expect:** a pill toggle "List | Calendar" in the header below the
   page title. Default selection is "List".
3. Click "Calendar". **Expect:** a month grid (7 columns, 6 rows),
   today's date highlighted with a filled pill, days outside the current
   month dimmed. Prev / Today / Next buttons in the header.
4. Click any empty day in the grid (one with no events). **Expect:**
   the "New event" modal opens, prefilled with that day at 9am.
5. Click an event chip on a populated day. **Expect:** the event detail
   drawer opens.
6. Refresh the page. **Expect:** view stays on Calendar (localStorage
   key `events_view_mode = "calendar"`).
7. Resize to 375px width. **Expect:** the grid hides; an agenda list
   (day headers + event chips) renders instead.
8. Toggle back to "List", refresh, confirm persistence.

**Pass criteria:** view persists across reload, calendar is interactive,
mobile fallback works.

---

## #7 — Signal review state machine

**Goal:** verify pending → approved/dismissed flow + member visibility
filter + sidebar badge.

**Steps:**
1. As admin, run the agent on any document detail page and ask it to
   "find issues with this document" (or trigger `signals.generateFromRules`
   from a button if surfaced — depending on what's wired). Today's signal
   pipeline is rule-based and defaults to `approved`, so for a true
   pending-review test you'll need to manually insert a `pending_review`
   signal via the Convex dashboard:
   ```
   npx convex run signals:_seedTestPending '{"familyId":"..."}'
   ```
   (If no helper exists, create the row directly in the dashboard with
   `review_status: "pending_review"` and `source: "llm"`.)
2. As admin, **expect:** the sidebar shows a small amber badge next to
   "Signals" with the pending count.
3. Navigate to `/signals/queue`.
4. **Expect:** the pending signal renders with Approve / Dismiss buttons.
5. Click "Dismiss", enter a reason "test dismiss", confirm.
6. **Expect:** the signal disappears from the queue. The sidebar badge
   decrements.
7. Sign out. Sign in as `david.williams@provostdemo.com` (member).
   Navigate to `/signals`.
8. **Expect:** the dismissed signal is NOT visible. Approved signals
   ARE visible.

**Pass criteria:** queue gates by role, approve/dismiss writes audit_events
rows, member view filters to approved-only.

---

## #8 — Domain-specific observation prompts

**Goal:** verify the per-document-type scaffolding is reachable from the
prompt-builder code (the LLM signal generator that consumes it isn't yet
wired, so this is a code-level smoke + a future-proofing check).

**Steps:**
1. Open the Convex dashboard or a node REPL. Import `signalScaffoldFor`
   from `convex/agent/prompts/domainSignals.ts`.
2. Call it with each of: `"Last Will and Testament"`, `"Irrevocable Life
   Insurance Trust"`, `"Revocable Living Trust"`, `"Family Constitution"`,
   `"Family Limited Partnership"`, `"GRAT"`, `"IDGT"`, `"CRUT"`.
3. **Expect:** distinct, document-type-specific scaffolding strings, each
   referencing the correct IRC sections and concerns for its document
   class. None should return the DEFAULT string.
4. Call with an unknown type like `"Random Document"`.
5. **Expect:** the DEFAULT scaffolding string.

**Pass criteria:** all 8 known types resolve to type-specific text; unknown
falls through to default; no thrown exceptions.

**Optional:** when a future LLM signal generator ships, re-run #7 with this
scaffolding wired in and verify the agent's flagged issues are domain-
appropriate (e.g. a will gets probate / intestacy flags, not Crummey
withdrawal flags).

---

## End-to-end regression

After all 8 walkthroughs, run:

```
pnpm vitest run
pnpm --filter @provost/agent test
pnpm --filter @provost/web exec tsc --noEmit
pnpm --filter @provost/web build
```

All four should be clean (24/24 + 8/8 tests, no TS errors, build succeeds).

If anything fails, capture: which step, which command, the full error
output, and any browser console messages. Reproduce on `localhost:3000`
before reporting — Vercel deploy may lag dev Convex by a few minutes.
