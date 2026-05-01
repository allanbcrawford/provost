# Beta Parity Implementation Plan — April 2026

**Source:** [`docs/gap-analysis-2026-04.md`](../gap-analysis-2026-04.md)
**Target:** PRD V1 Beta parity for April 15 launch (2–3 client families)
**Generated:** 2026-04-30
**Estimated effort:** ~25–30 engineer-days, compressible to 3–4 calendar weeks with parallel tracks

---

## Plan shape

Phased, dependency-driven, parallelizable. Phase 0 lands first (audit + doc reconciliation gates everything). Phases 2–6 can run in parallel tracks once Phase 1 foundations are in place.

```
Phase 0 (audit + doc rewrite)
       │
       ▼
Phase 1 (foundations: feature gate, generation tone, isolation, AI SDK)
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
Phase 2          Phase 3        Phase 4        Phase 5
(Onboarding)    (Education)    (AI Chat)     (Estate/Docs)
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
              Phase 6 (Advisor + Shell)
                      │
                      ▼
              Phase 7 (Beta hardening)
```

---

## Notes on scope

- **Beta only.** Listen/Watch (NotebookLM), mobile, Protopia, full doc-extraction pipeline, multi-advisor collab — explicitly out per `beta-scope-request.md`.
- **345 Succession Advisors artifacts: ALREADY INGESTED** into the Convex Provost admin library (`library_sources`). The §6.8 content-intake blocker is closed. What remains is *verification of retrieval and lesson-generation pipelines against this corpus*, not bulk ingestion.
- **Non-engineering blockers tracked separately.** Brad's 8 product decisions (`docs/gap-analysis-2026-04.md` §6.5) gate launch but not engineering progress. Phase dependencies on them are flagged inline.
- **Stack is Convex + Clerk + Vercel.** The PRD/ADR/backend-map prescribe a different stack; we're aligning *to the running implementation*, not migrating to the doc stack. See Phase 0 doc reconciliation.

---

## Phase 0 — Audit & doc reconciliation (~3 days)

**Why first:** §1 of the gap analysis has many 🟡 "likely exists, verify" rows. Without an audit pass, we'll either (a) duplicate work that already shipped, or (b) miss visual fidelity gaps. Doc rewrites land in parallel so future agents stop reading phantom infrastructure.

### Issue 0.1 — Visual + functional audit pass against Figma (`*Robert Beta*` frames)

**Goal:** Convert every 🟡 row in §1 to ✅ or ❌ with a short note. Output: `docs/audit-2026-04.md`.

**Acceptance criteria:**
- Walk through `Dropbox/Provost/Design/` PNGs (68 frames) side-by-side with the running app
- For each pillar in §1, mark each 🟡 row as: ✅ shipped / ❌ missing / 🔧 partial-needs-work, with one-line notes citing files
- Specifically validate: chat panel docked-collapsible (not floating), fonts loaded (Fraunces / Source Serif 4 / Geist), background is white not cream, bento home matches Figma
- Output replaces the 🟡 rows in `docs/gap-analysis-2026-04.md` §1

**Lift:** ~1.5 days
**Assignee:** any frontend-fluent eng + designer if available
**Blocks:** all of Phase 2–6

### Issue 0.2 — Doc reconciliation (project + vault)

**Goal:** Stop the stack-divergence confusion. Archive prescriptive docs that describe systems we didn't build.

**Acceptance criteria:**
- Write `docs/adr/ADR-9-convex-over-postgres.md` documenting the reversal from ADR-8 (Drizzle/pgvector) to Convex
- Mark `Dropbox/Provost/Product/backend-map.md` and `frontend-map.md` as ARCHIVAL with a banner pointing to current reality
- Mark `Provost AI — Technical Roadmap.md` Phase 1 (Supabase) as superseded; keep phase-level deliverable tracking
- Update `2026-04-07-provost-v1-architecture.md` ADR-3 (per-family DBs) → "Convex row-scoped multi-tenancy"; ADR-4 (Firebase) → "Clerk"; ADR-8 (Drizzle) → "Convex schema"
- Update vault `Dropbox/Provost/CLAUDE.md`, `Maps/Architecture MOC.md`, `Beta/onboarding-checklist.md` to reflect Convex/Clerk/Vercel + remove legacy DB-wipe blocker
- Note in vault `CLAUDE.md`: 345 artifacts already in admin library; cite `library_sources` table

**Lift:** ~1 day
**Assignee:** technical writer / lead eng
**Blocks:** none, but reduces friction for every subsequent phase

### Issue 0.3 — Brad decision queue surfaced

**Goal:** Single dashboard of the 8 product decisions Brad owes (gap analysis §6.5). Not engineering work — coordination.

**Acceptance criteria:**
- File `docs/brad-decisions-2026-04.md` listing all 8 decisions with: owner, downstream-blocked-by, recommended default if Brad doesn't respond by date X
- Recommended defaults so eng isn't blocked: assume AI chat IN beta, assume curriculum margin notes APPLY, assume pre-generate lessons (not on-demand) for cost predictability

**Lift:** ~0.5 day

---

## Phase 1 — Foundations (~3 days, runs after Phase 0)

**Theme:** Cross-cutting pieces that every later phase depends on.

### Issue 1.1 — Verify / build FeatureGate runtime pattern

**Source:** Gap §6.2

**Goal:** `<FeatureGate feature="...">` wrapper exists and supports `real | launching_soon | disabled`, with Williams family bypass.

**Acceptance criteria:**
- Component exists at `apps/web/src/components/ui/feature-gate.tsx` (or equivalent)
- Config map keyed by module name (`education`, `family`, `messages`, `events`, `assets`, `estate`, `our_team`)
- Demo families bypass to `real`; non-demo families default to `launching_soon`
- `LaunchingSoon` overlay component blurs underlying content with explanatory copy
- Per-family override stored in `family_registry` or equivalent Convex table; flip is one mutation
- Wrap each module's top-level page with `<FeatureGate>`; verify behavior with one demo + one non-demo family

**Files:**
- `apps/web/src/components/ui/feature-gate.tsx` (new or audit)
- `apps/web/src/components/ui/launching-soon.tsx` (new or audit)
- `convex/schema_parts/core.ts` — add `feature_overrides` to families table if missing
- `apps/web/src/app/(app)/{education,family,messages,events,assets,estate,professionals}/page.tsx` — wrap

**Lift:** S–M (~1 day if exists, ~1.5 days if building)

### Issue 1.2 — Wire Generation Tone into AI system prompts

**Source:** Gap §6.3

**Goal:** Gen 1 / Gen 2 / Gen 3 tone calibration drives chat responses + lesson generation tone.

**Acceptance criteria:**
- Helper `getGenerationTone(member)` returns `'gen1' | 'gen2' | 'gen3'` based on age (60+ / 35–55 / 16–30)
- System prompt assembly in `convex/agent/` includes a tone block matching the spec table in `Concepts/Generation Tone.md`
- Lesson generation pipeline (article tone) injects same tone block
- Test: same lesson topic generated for a Gen 1 vs Gen 3 member produces noticeably different copy
- Tone block sourced from a single canonical constant — not duplicated across prompt assembly sites

**Files:**
- `convex/lib/generationTone.ts` (new)
- `convex/agent/run.ts` or wherever system prompt is assembled — inject
- `convex/lessons.ts` (or lesson-gen action) — inject

**Lift:** S–M (~1 day)

### Issue 1.3 — Cross-family isolation test in CI

**Source:** Gap §1 Pillar 13 + §4.B item #13

**Goal:** Automated test that asserts a user from Family A cannot read or mutate Family B data through any Convex function.

**Acceptance criteria:**
- Test in `tests-convex/` exercises `requireFamilyMember` on representative read + write functions
- Two seeded families with disjoint members; user from Family A authenticated; assertions for `Forbidden` on every Family B query/mutation
- Runs in CI on every PR; failures block merge

**Files:**
- `tests-convex/family-isolation.test.ts` (new)
- `convex/lib/authz.ts` (verify guards)

**Lift:** S (~0.5 day)

### Issue 1.4 — Vercel AI SDK adoption decision + migration scope

**Source:** Gap §4.B item #12, ADR-5

**Goal:** Decide whether to migrate from direct OpenAI SDK calls to Vercel AI SDK now or defer to V2.

**Acceptance criteria:**
- Spike: identify all OpenAI direct-call sites in `convex/`, count them, estimate migration lift
- Decision recorded in `docs/adr/ADR-10-vercel-ai-sdk.md`: adopt-now (with scope) or defer-to-V2 (with trigger)
- If adopt-now: create follow-up issues per call site; if defer: note the strategic risk and review date

**Lift:** S (~0.5 day for spike + decision)

---

## Phase 2 — Onboarding & Living Map (~5 days)

**Theme:** Make the family-creation flow feel as good as the PRD describes.

### Issue 2.1 — Conversational New Member Form (chat tool)

**Source:** Gap §1 Pillar 1 #5, Pillar 7 #2; Provost AI vision capability #3

**Goal:** "Add Member" opens chat panel with Provost guiding intake conversationally, capturing 8+ required fields.

**Acceptance criteria:**
- Chat tool `add_family_member` defined in `convex/agent/tools/`
- Tool prompts for: name, preferred name, DOB, relationship, role, education level, stewardship phase, email — in a friendly conversational sequence, not a form dump
- Tool call requires user approval before mutation (uses existing `tool_call_approvals` flow)
- On approval: creates member in `family_users`, sets stewardship phase via Issue 1.2 helper, sends Clerk invite
- Same tool reused for "Add Member" on Our Team / External professional flow (different field set)
- Empty-state "Add Member" button on Family page + Family Tree opens chat with this tool primed

**Files:**
- `convex/agent/tools/addFamilyMember.ts` (new)
- `convex/agent/tools/addProfessional.ts` (new — variant)
- `apps/web/src/features/family/family-page.client.tsx` — wire empty-state button
- `apps/web/src/features/professionals/` — wire empty-state button
- `apps/web/src/features/chat/` — confirm tool surfaces in approval UI

**Lift:** M (~2 days)

### Issue 2.2 — Stewardship phase auto-assign + advisor override

**Source:** Gap §1 Pillar 1, PRD §6.1 step 3

**Goal:** Adding a member auto-assigns phase based on age + role; advisor can override from member detail UI.

**Acceptance criteria:**
- Rule function `assignStewardshipPhase({ age, role })` returns `emerging | developing | operating | enduring`
- Default rules (verify with Brad — Roadmap Open Q #1): age <22 + non-trustee → emerging; 22–34 → developing; 35–59 + active role → operating; 60+ or trustee/grantor → enduring
- Auto-assign on member creation (via Issue 2.1 tool)
- Advisor UI: dropdown on member detail page to override; logged in `audit_events`

**Files:**
- `convex/lib/stewardshipPhase.ts` (new or audit)
- `apps/web/src/features/family/member-detail.tsx` — add override dropdown

**Lift:** S (~0.5 day)
**Depends on:** Brad decision on age thresholds (Roadmap Q #1)

### Issue 2.3 — Empty-state illustrations

**Source:** Gap §1 Pillar 1; PRD §16.7

**Goal:** Family list, Family Tree modal, Estate, and other module empty states show illustrations matching the design language.

**Acceptance criteria:**
- List-style illustration for Family list empty state
- Waterfall-style illustration for Family Tree modal empty state
- Document-style illustration for Estate empty state
- Illustrations match Figma frames (export from Design/ if needed) or use a consistent line-art style aligned with confirmed design tokens (white bg, no cream)

**Files:**
- `apps/web/src/components/illustrations/` (new)
- Wire into respective empty states

**Lift:** S (~0.5–1 day; depends on whether illustrations need to be sourced or drawn)

### Issue 2.4 — Williams roster reconciliation + 2 seeded observations

**Source:** Gap §1 Pillar 12, §6.6, PRD §19

**Goal:** Demo seed matches PRD §19.1 names exactly; both intentional discrepancies (pour-over date 2019 vs 2025; ILIT Trustee = Grantor) are seeded as live observation cards.

**Acceptance criteria:**
- `convex/seed_data/family.json` lists the 12 PRD §19.1 members (Robert/Linda/David/Susan/Jennifer/Michael Reynolds + Emily/Ryan/Sophia/Matthew/Chloe/Ethan)
- Reconcile any conflict with prior `Margaret/Elizabeth Harper` naming from V1 architecture doc (PRD wins per §4.A doc reconciliation)
- `convex/seed_data/professionals.json` lists Mike Harrington (CFA), Sarah Lin (JD/LL.M), David Johnson (CPA/CFP)
- Two observations seeded:
  1. **Pour-Over Will Date Mismatch** — severity warning, on RLT document, includes recommended-action copy from PRD §19.4
  2. **Grantor and Trustee Are the Same Person** — severity critical, on ILIT document, includes IRC §2042 risk language and recommended action
- Both visible in advisor observation review UI

**Files:**
- `convex/seed_data/family.json`
- `convex/seed_data/professionals.json`
- `convex/seed_data/observations.json` (new or extend)
- `convex/seed.ts` — wire observations into seed mutation

**Lift:** S (~0.5 day)

---

## Phase 3 — Education polish (~5 days)

**Theme:** The core beta value prop. Lessons must feel polished end-to-end.

### Issue 3.1 — 4-format progress circles on lesson preview (PRO-131)

**Source:** Gap §1 Pillar 2; PRO-131; PRD §16.6

**Goal:** Lesson preview shows Read / Listen / Watch / Quiz icons, each with a Material Design progress ring around the icon reflecting completion percentage.

**Acceptance criteria:**
- Component `<FormatProgressIcon kind="read|listen|watch|quiz" progress={0..1} disabled={bool} />`
- Listen + Watch render disabled with "Coming soon" tooltip per beta scope
- Read progress = scroll depth or explicit completion event
- Quiz progress = 0 if not started, 0.5 if in-progress, 1.0 if passed
- Used on lesson preview AND in family-progress views (PRO-135 row icons)

**Files:**
- `apps/web/src/components/lessons/format-progress-icon.tsx` (new)
- `apps/web/src/features/lessons/lesson-preview.tsx`
- `apps/web/src/features/lessons/family-progress.tsx`

**Lift:** S (~1 day)

### Issue 3.2 — End-of-article controls (👍/👎 / Feedback / Share / You might also enjoy)

**Source:** Gap §1 Pillar 2; PRD §16.6

**Goal:** Article-style lesson view ends with thumbs up/down, Feedback button (writes to `lesson_feedback`), Share button, and 2–3 recommended adjacent lessons.

**Acceptance criteria:**
- Thumbs up/down writes to `lesson_feedback` with `kind: 'thumb'`
- Feedback button opens chat panel with prompt primed for written feedback (also writes to `lesson_feedback`)
- Share button copies a link to the lesson (auth-protected)
- "You might also enjoy" pulls 2–3 lessons from same track or adjacent tracks (simple sort by track sort_order proximity)

**Files:**
- `apps/web/src/features/lessons/end-of-article.tsx` (new)
- `convex/lessons.ts` — add `relatedLessons(lessonId)` query
- `convex/lessons.ts` — extend feedback mutation if needed

**Lift:** S–M (~1 day)

### Issue 3.3 — Education Progress tab — stewardship-phase line chart (PRO-135)

**Source:** Gap §1 Pillar 2 (Progress tab); PRO-135

**Goal:** Progress tab shows family-member progress across all 4 programs as a visualization matching Figma.

**Acceptance criteria:**
- Line chart per family member showing progress through their phase's program (lesson completions over time)
- Member-level "X Lessons" expand-row shows lesson-by-lesson progress with format icons (Issue 3.1)
- Lessons mark "complete" with checkmark or "needs attention" with `i` icon (started long ago, not finished, or many failed quiz attempts)
- Recharts or similar; matches Figma styling

**Files:**
- `apps/web/src/features/lessons/progress-tab.tsx`
- `apps/web/src/components/charts/stewardship-phase-chart.tsx` (new)

**Lift:** M (~1.5 days)

### Issue 3.4 — Lesson "2-at-a-time" delivery cadence

**Source:** Gap §1 Pillar 2; Roadmap Phase 4

**Goal:** Each user sees exactly 2 active lessons at any time; completing + passing quiz unlocks the next.

**Acceptance criteria:**
- Query `myActiveLessons(memberId)` returns the 2 currently-active lessons for a user
- On lesson completion (with passing quiz score ≥ pass_score), next lesson in track flips from `locked` → `active`
- If user is on the last lesson of a track, next track's first lesson activates
- Advisor manual unlock available via override mutation (logged in audit_events)
- Trigger logic: quiz pass is the unlock trigger (per Roadmap Open Q #4 — recommended default; confirm with Brad)
- Home page "highlights" tile reads from this query for the "2 new lessons" card

**Files:**
- `convex/lessons.ts` — `myActiveLessons` query, `completeLesson` mutation logic
- `convex/learning.ts` (or schema_parts) — verify lesson status enum
- `apps/web/src/app/(app)/lessons/page.tsx` — render exactly 2

**Lift:** M (~1.5 days)
**Depends on:** Brad decision (Roadmap Q #4)

### Issue 3.5 — Apply Brad's curriculum margin notes

**Source:** Gap §1 Pillar 2 + `education-brad-feedback.md`

**Goal:** 9 documented edits to curriculum (renames, priority changes, deletions, splits) applied to the platform DB.

**Acceptance criteria:**
- Per `education-brad-feedback.md`: Income Sources lesson expanded; Building Blocks lesson moved Developing→Operating + split into Asset Classes + Asset Allocation; "How Assets Actually Transfer" split into Titling + Beneficiary Designations; "When You Can't Speak for Yourself" renamed to Powers of Attorney; "$27.98M Window" replaced with two Core lessons (Wealth Transfer Taxes Basics, Using Your Wealth Transfer Exemptions); Dynasty Trusts → Extended; Charitable Structures → Exploratory; Across Borders deleted; Five Capitals lesson 3 renamed
- Idempotent migration script in `convex/migrations/` that's safe to re-run

**Files:**
- `convex/migrations/2026-04-curriculum-edits.ts` (new)
- `convex/seed_data/lessons.json` — update for fresh seeds

**Lift:** S (~0.5 day)
**Depends on:** Brad sign-off on each margin note (TASKS.md item)

### Issue 3.6 — Breadcrumbs lesson → track → program

**Source:** Gap §1 Pillar 2

**Goal:** Lesson detail page shows breadcrumb chain back to track and program; clickable.

**Acceptance criteria:**
- Header breadcrumb on `/lessons/[lessonId]` reads `Education / [Program] / [Track] / [Lesson]`
- Each segment links to its parent view
- Uses existing `breadcrumb-context.tsx`

**Files:**
- `apps/web/src/app/(app)/lessons/[lessonId]/page.tsx`
- `apps/web/src/context/breadcrumb-context.tsx`

**Lift:** S (~0.5 day)

---

## Phase 4 — AI Chat completion (~4 days)

**Theme:** The conversational surface that PRD §16.2, §16.3, §17 spec in detail.

### Issue 4.1 — Full-screen chat parity (PRO-133)

**Source:** Gap §1 Pillar 3; PRO-133; PRD §17

**Goal:** Full-Screen Chat matches the 6 Figma frames; mutually exclusive with the side rail.

**Acceptance criteria:**
- Chat-bubble (+) icon in header opens full-screen chat in the center panel
- While active: side rail "Open Chat" button switches to "Chatting…" disabled state
- Prompt Ideas show 8 general starter prompts on first hover; expand panel; click populates input + collapses
- Input state machine: idle → blue arrow (enter ready) → black square (streaming, click to stop) → idle
- Markdown rendering matches Claude-style formatting (already in repo)
- Full-screen chat history stored separately from page-contextual chat history (different `thread.kind` or similar)

**Files:**
- `apps/web/src/app/(app)/chat/page.tsx` — verify against Figma
- `apps/web/src/components/header.tsx` — chat-bubble button + Chatting… lock state
- `apps/web/src/features/chat/prompt-ideas.tsx` — 8-prompt expand/collapse
- `convex/schema_parts/chat.ts` — add `thread.kind: 'side_rail' | 'full_screen'` if absent

**Lift:** M (~1.5 days)

### Issue 4.2 — Header Open Chat / Close Chat toggle (PRO-134)

**Source:** PRO-134

**Goal:** Header button toggles between "Open Chat" and "Close Chat" reflecting side rail state.

**Acceptance criteria:**
- Button label updates with `isOpen` state from `chat-panel-context`
- Disabled with "Chatting…" copy when full-screen chat is active

**Files:**
- `apps/web/src/components/header.tsx`

**Lift:** S (~0.25 day)

### Issue 4.3 — Page-contextual prompt ideas verified end-to-end

**Source:** Gap §1 Pillar 3; PRD §16.2

**Goal:** Side-rail chat shows 3–5 prompt ideas relevant to the current center panel; refreshes per route.

**Acceptance criteria:**
- `prompt_suggestions_cache` populated per `(page_kind, selection_id)` tuple
- Cache miss triggers a Convex action that calls OpenAI with current page context to generate 3–5 prompts
- Cache TTL ~1 hour; invalidated on relevant data mutation
- Prompts visibly differ between e.g. `/lessons/[id]` and `/family` pages
- Click populates input

**Files:**
- `convex/agent/promptSuggestions.ts` (audit / extend)
- `apps/web/src/features/chat/prompt-ideas.tsx`
- `apps/web/src/hooks/use-page-context.ts` — should already exist per `v1-next-six.md` Task 6

**Lift:** S–M (~1 day)
**Depends on:** the page-context wiring from `docs/plans/v1-next-six.md` Task 6 — confirm landed

### Issue 4.4 — Chat history surfaced in left nav (Claude Recents pattern)

**Source:** Gap §1 Pillar 3; PRD §16.1

**Goal:** Left nav has a "Chat history" section listing recent threads, click opens that thread in side rail.

**Acceptance criteria:**
- Collapsible "Chat history" section in `sidebar-nav.tsx` (defaults closed)
- Lists last 10 threads for current user with first-line preview
- Click opens the thread in side rail (chat-panel-context loads it)
- Threads created via tool-call workflows show their summary, not raw first message

**Files:**
- `apps/web/src/components/sidebar-nav.tsx`
- `convex/chat.ts` — `recentThreads` query

**Lift:** S (~0.75 day)

### Issue 4.5 — Confirm chat panel is docked-collapsible (not floating)

**Source:** Gap §6.6; supersedes PRD §16.2

**Goal:** Chat panel is the docked side panel from `Design MOC.md` — collapses to a strip with expand arrow. Visual fidelity vs Figma.

**Acceptance criteria:**
- Side rail docks to right edge (no 40/40/40/50 floating padding)
- Collapses to a thin strip with chevron / expand affordance
- Expand restores prior width
- State persisted to localStorage (already in repo per audit)

**Files:**
- `apps/web/src/components/chat-rail.tsx`
- `apps/web/src/styles.css` — docked layout tokens

**Lift:** S (~0.5 day; mostly verification + cleanup)

---

## Phase 5 — Estate & Documents (~4 days)

**Theme:** The "wow" surface for advisor demos — observations, smart view, wealth flow.

### Issue 5.1 — Smart View expandable rows

**Source:** Gap §1 Pillar 5; PRD §16.8

**Goal:** Document Smart View tab renders an intelligent summary with expandable rows for deeper detail.

**Acceptance criteria:**
- Smart View pulls from `documents.summary` (already populated) + per-section breakdown
- Sections render as collapsed rows; click expands inline
- "Provost is working on this..." chat message appears when user prompts deeper analysis; result then surfaces in Smart View (per PRD §16.8 spec)
- Cross-references to related agreements where applicable

**Files:**
- `apps/web/src/features/documents/smart-view.tsx` (new or audit)
- `convex/documents.ts` — `documentSections(documentId)` query

**Lift:** M (~1.5 days)

### Issue 5.2 — Cross-tab document search with highlight

**Source:** Gap §1 Pillar 5; PRD §16.8

**Goal:** Search bar at top of document detail highlights matches in Smart View AND Document tab simultaneously, with match count badges per tab.

**Acceptance criteria:**
- Search icon in document header toggles search bar (replacing the two right-side buttons per Figma)
- Type → debounced search → blue highlight on all matches in both tabs
- Match count badges show on each tab; counts are equal
- Smart View uses 100% exact extracted content (not summary) when searching, per PRD spec

**Files:**
- `apps/web/src/features/documents/document-search.tsx` (new)
- `apps/web/src/features/documents/document-detail.tsx`

**Lift:** M (~1.5 days)

### Issue 5.3 — Wealth Flow multi-agreement selector

**Source:** Gap §1 Pillar 5; PRD §16.8

**Goal:** Wealth Flow modal supports selecting which agreements feed the waterfall via radio buttons in a dropdown.

**Acceptance criteria:**
- Modal header shows "X Agreements" dropdown
- Dropdown lists all family agreements with radio buttons; toggle includes/excludes from waterfall
- Diagram re-renders on selection change
- Single-document mode (opened from a specific agreement) shows only that doc, no dropdown
- Share button (2-person icon) for collaborative views

**Files:**
- `apps/web/src/components/waterfall-diagram/wealth-flow-modal.tsx`
- `apps/web/src/features/estate/agreement-selector.tsx` (new)

**Lift:** M (~1 day; depends on existing waterfall-diagram completeness)

### Issue 5.4 — Estate agreement card metadata (PRO-132)

**Source:** PRO-132

**Goal:** Estate page agreement cards show author and date metadata (currently missing).

**Acceptance criteria:**
- Each agreement card shows: title, document type, executed date (from `parent_document_id` chain root or document metadata), author/preparer
- Clicking card opens document detail
- Empty fields show "—" not blank

**Files:**
- `apps/web/src/features/estate/agreement-card.tsx`
- `convex/documents.ts` — extend list query to include metadata

**Lift:** S (~0.5 day)

---

## Phase 6 — Advisor multi-family + App Shell polish (~4 days)

**Theme:** Scale the experience from one family to many; finish the navigational and visual chrome.

### Issue 6.1 — Advisor cross-family dashboard + family-selector chip

**Source:** Gap §1 Pillar 11; PRD §18

**Goal:** Advisor login defaults to multi-family aggregate view; top-left chip shows family count and switches to single-family view.

**Acceptance criteria:**
- On login as `advisor` role: default to `/home` showing aggregate highlights across all assigned families
- Top-left header replaces "Williams" with "X Families" chip → dropdown lists assigned families
- Selecting a family scopes the entire app to that family's data (already partially in `family-context.tsx`)
- Aggregate view shows: total pending observations, family-member-engagement stats, upcoming events across families
- No cross-family data leakage — aggregate is roll-up only

**Files:**
- `apps/web/src/features/advisor/multi-family-home.tsx` (new)
- `apps/web/src/components/header.tsx` — chip + dropdown
- `convex/advisor.ts` (new) — aggregate queries
- `apps/web/src/context/family-context.tsx` — verify selector wiring

**Lift:** M (~2 days)

### Issue 6.2 — Family page Fun Facts / History / Values tabs (PRO-128)

**Source:** Gap §6.1 / PRO-128

**Goal:** Family page tab structure includes Fun Facts, History, and Values per Brad's ticket.

**Acceptance criteria:**
- Tabs render under family page center panel; existing fun-facts route already supports content
- History tab shows family timeline (key events, member additions, document executions chronologically)
- Values tab shows family mission/values statement (free-text editable by family_admin)
- New schema fields if needed: `families.values_statement`, `family_history_events` table

**Files:**
- `apps/web/src/features/family/family-tabs.tsx` (new)
- `convex/schema_parts/core.ts` — add values_statement, history_events
- `apps/web/src/features/family/values-tab.tsx`, `history-tab.tsx` (new)

**Lift:** M (~1.5 days)

### Issue 6.3 — Messages 3-column layout (PRO-136)

**Source:** PRO-136

**Goal:** Messages page is 3-column: thread list / reading pane / chat rail.

**Acceptance criteria:**
- Left column: inbox/drafts/sent thread list
- Middle column: selected thread reading pane with reply composer
- Right column: chat rail (existing component)
- Responsive: collapses to 2-column then 1-column on smaller widths

**Files:**
- `apps/web/src/app/(app)/messages/page.tsx`
- `apps/web/src/features/messages/messages-layout.tsx` (new)

**Lift:** M (~1 day)

### Issue 6.4 — Dark mode

**Source:** Gap §1 Pillar 10

**Goal:** User-toggleable dark mode via profile dropdown; theme tokens applied globally.

**Acceptance criteria:**
- Toggle in profile-modal-context settings
- Theme stored on user record + localStorage
- All design tokens have dark counterparts in `styles.css`
- Charts, illustrations, PDF viewer respect theme

**Files:**
- `apps/web/src/styles.css` — dark theme tokens
- `apps/web/src/context/profile-modal-context.tsx` — theme state
- `apps/web/src/app/layout.tsx` — apply theme class

**Lift:** M (~1.5 days)

### Issue 6.5 — Active users presence dot

**Source:** Gap §1 Pillar 10; PRD §16.1

**Goal:** Left nav "Active" section shows other Provost users currently online (read-only for beta).

**Acceptance criteria:**
- Convex `presence` table tracks last-seen-at per user; updated on heartbeat
- Users with last_seen_at within 60s show green dot
- Family members + assigned professionals visible in this section
- No live chat affordance (deferred per ADR)

**Files:**
- `convex/schema_parts/presence.ts` (new)
- `convex/presence.ts` — heartbeat mutation, listActive query
- `apps/web/src/components/sidebar-nav.tsx` — Active section
- `apps/web/src/hooks/use-presence-heartbeat.ts` (new)

**Lift:** M (~1 day)

---

## Phase 7 — Beta hardening (~2 days)

**Theme:** SOC 2 readiness, perf budgets, ops surface.

### Issue 7.1 — Audit log coverage on sensitive operations

**Source:** Gap §1 Pillar 13

**Goal:** Every mutation that touches family data writes to `audit_events`.

**Acceptance criteria:**
- Helper `withAudit(fn, eventKind)` wraps mutations
- Coverage on: member add/edit/delete, document upload/delete, observation approve/dismiss, learning override, family creation
- Audit events viewable in admin UI

**Files:**
- `convex/lib/audit.ts`
- All mutation files in `convex/`

**Lift:** S (~0.5 day)

### Issue 7.2 — SOC 2 post-launch audit checklist run

**Source:** `docs/deploy/post-launch-audit.md`

**Goal:** All 9 items in the audit checklist pass.

**Acceptance criteria:**
- Run through `docs/deploy/post-launch-audit.md`
- File `docs/audit-results-2026-04.md` with each item ✅ / ❌ + remediation note
- Remediate any ❌ before April 15

**Lift:** S (~0.5 day to run; remediation lift TBD per finding)

### Issue 7.3 — Perf budgets

**Source:** Gap §1 Pillar 13; PRD §9 (chat <3s, page <1s)

**Goal:** Lighthouse perf budget enforced in CI; chat TTFT measured.

**Acceptance criteria:**
- Vercel Speed Insights enabled (probably already on)
- Lighthouse CI on PR with thresholds (perf ≥85, accessibility ≥90)
- Convex action `chat.send` instrumented with TTFT metric → /status page

**Files:**
- `.github/workflows/lighthouse.yml` (new)
- `apps/web/src/app/status/page.tsx` — TTFT widget

**Lift:** S (~0.5 day)

### Issue 7.4 — /status page enrichment

**Source:** Gap §1 Pillar 16

**Goal:** /status surfaces Convex deploy SHA, OpenAI provider status, last cron run times.

**Acceptance criteria:**
- Reads `COMMIT_SHA` and `COMMIT_TIME` env vars (already documented in CLAUDE.md)
- Convex query returns last successful run for each cron in `convex/crons.ts`
- OpenAI status: simple ping with timeout; show ✓ / ✗

**Files:**
- `apps/web/src/app/status/page.tsx`
- `convex/status.ts` (new)

**Lift:** S (~0.5 day)

---

## Out of beta scope — schedule for V2

Tracked here for visibility, not phased.

- Listen mode (NotebookLM podcast)
- Watch mode (NotebookLM video)
- Mobile apps (iOS/Android)
- Protopia privacy layer
- Full document → entity-extraction pipeline
- Multi-advisor collaboration
- Per-page granular permissions for external professionals
- Provost-as-meeting-host scheduling tool
- Real-time co-presence live chat
- Plaid / Addepar integrations

---

## Total effort summary

| Phase | Lift | Calendar (1 eng) | With parallelism |
|---|---|---|---|
| 0 — Audit + docs | 3 days | 3 days | 3 days |
| 1 — Foundations | 3 days | 3 days | 1.5 days (parallel) |
| 2 — Onboarding | 5 days | 5 days | 3 days |
| 3 — Education | 5 days | 5 days | 3 days |
| 4 — AI Chat | 4 days | 4 days | 2 days |
| 5 — Estate/Docs | 4 days | 4 days | 2 days |
| 6 — Advisor + Shell | 4 days | 4 days | 2 days |
| 7 — Hardening | 2 days | 2 days | 2 days |
| **Total** | **~30 days** | **~6 cal weeks** | **~3.5 cal weeks** |

Phases 2–6 can run in parallel after Phase 1 lands. Two engineers with clean handoffs hit the April 15 target with margin; one engineer is tight but doable if Phase 0 reveals fewer 🟡-actually-needs-work rows than feared.

---

## Critical-path callouts

These items can compress the timeline if accelerated; or stretch it if delayed:

1. **Phase 0 audit (Issue 0.1).** Outcome dictates how much of Phases 2–6 is verification vs greenfield. **Run this first.**
2. **Brad's 8 product decisions (`docs/brad-decisions-2026-04.md`).** Issues 2.2 (age thresholds), 3.4 (lesson cadence trigger), 3.5 (margin notes) all gate on Brad. Recommend defaults to keep moving.
3. **Issue 2.1 (New Member Form chat tool).** Largest single feature. Touches chat infrastructure used by every other tool-call surface — get it right early so subsequent tools follow the same pattern.
4. **Issue 5.1–5.3 (Estate Smart View + Search + Wealth Flow).** Highest demo impact for advisor walkthroughs. If beta-family acceptance criteria emphasize estate UX, prioritize this track.

---

## Companion artifact

A machine-readable `plans/progress.json` will be written alongside this plan for autonomous session execution per the tactical-execution pattern in `~/.claude/CLAUDE.md`. See `plans/progress.json` for issue-level tracking.
