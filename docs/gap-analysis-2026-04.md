# Provost — Doc-to-Code Gap Analysis (April 2026)

**Source docs:** `Dropbox/Provost/Product/` (PRD April 2026, V1 Architecture ADR, Technical Roadmap, backend-map, frontend-map, education-curriculum, lesson-modalities, beta-scope-request, education-brad-feedback)
**Repo audited:** `provost/` monorepo (apps/web + convex/) on `main`, generated 2026-04-30
**Audience:** Allan / engineering lead

---

## TL;DR

The codebase is **substantially further along than the PRD/roadmap implies for V1 Beta** — most product surfaces (auth, family, lessons, chat, documents, assets, messages, events, team, demo seed) are already shipping in some form on Vercel + Convex.

The headline finding is **not a feature gap, it's a stack divergence**. The two architecture docs (ADR + Roadmap) prescribe a stack the team did not build:

| Layer | Docs prescribe | Repo actually uses |
|---|---|---|
| Backend | FastAPI (backend-map) **or** Next.js API Routes + Drizzle (ADR) | **Convex** (functions + schema in `convex/`) |
| DB | Postgres + pgvector, **per-family isolated DBs** | Single Convex deployment, `family_id` row-scoping |
| Auth | Firebase Auth (ADR) / Supabase Auth (Roadmap) / cookie sessions (backend-map) | **Clerk** (JWT, working) |
| Hosting | GCP Cloud Run (ADR) / AWS ECS (backend-map) | **Vercel** |
| AI | Vercel AI SDK with multi-provider | OpenAI direct (gpt-4o + embeddings) via Convex actions |
| ORM | Drizzle | Convex schema |

**Decision required before any "alignment" work:** are the docs the source of truth (=> rewrite), or is the running implementation the source of truth (=> rewrite the docs)? My strong recommendation is the latter — see Section 4.

---

## 1. Feature-by-feature gap matrix

Sized as **S** (≤2d), **M** (2–10d), **L** (>10d). Status reflects functional completeness vs PRD §16 UX + Roadmap deliverables, *not* doc-stack alignment.

### Pillar 1 — Living Map / Family

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Family CRUD, members, relationships | ✅ `convex/schema_parts/core.ts`, `convex/families.ts`, `apps/web/src/features/family/` | none | — |
| Stewardship phase auto-assign w/ advisor override | 🟡 `stewardship_phase` field stored; auto-assign rules unconfirmed | Verify rule-based assignment exists; expose advisor override UI | S |
| Family tree (ReactFlow waterfall) | ✅ family-page.client.tsx | Confirm matches Figma node design | S |
| Empty state illustrations (list + tree) | ❌ likely missing | Add list-style + waterfall-style illustrations | S |
| New Member Form *inside chat window* | ❌ form tool stub in backend-map; unclear in repo | Build conversational intake as chat tool | M |

### Pillar 2 — Education / Learning

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Programs / Tracks / Lessons schema | ✅ `convex/schema_parts/learning.ts` | none | — |
| Curriculum seeded (4 programs, 20 tracks, ~88 lessons) | 🟡 `convex/seed_data/lessons.json` exists; need to verify it matches `education-curriculum.md` | Reconcile catalog count + Brad's margin notes (`education-brad-feedback.md`) | S–M |
| Brad's curriculum edits applied (renames, priority changes, deletions) | ❌ doc says "NOT applied to seed" | Apply 9 edits after Brad sign-off | S |
| My Lessons (2 active per user) delivery cadence | 🟡 lessons exist; "2-at-a-time" trigger unclear | Define trigger (quiz pass / time / advisor) and enforce | M |
| Read mode (article + Markdown) | ✅ slides + markdown article supported | none | — |
| Listen mode (NotebookLM podcast) | ❌ deferred per beta-scope-request | Phase 16 — out of beta scope | L |
| Watch mode (NotebookLM video) | ❌ deferred | Phase 16 — out of beta scope | L |
| Quiz engine + gating | ✅ `quizzes`, `quiz_attempts` in schema | Verify gating logic for next-lesson delivery | S |
| Lesson preview (4 format icons w/ Material progress circles) | 🟡 lesson player exists; progress-ring icons unconfirmed | Add 4-icon progress circle per Figma | S |
| End-of-article: thumbs / Feedback / Share / "You might also enjoy" | 🟡 `lesson_feedback` table exists | Wire UI controls + recommendations | S–M |
| Bookmarks tab | ✅ `lesson_bookmarks` schema + UI | none | — |
| Programs tab (permission-gated) | 🟡 surfaced per audit | Verify gating + sample-prompts strip at bottom | S |
| Progress tab w/ family-member visualization | 🟡 surfaced | Verify chart matches Figma; add "i" needs-attention indicator | S |
| Breadcrumbs lesson → track → program | 🟡 breadcrumb-context exists | Verify lesson-detail breadcrumb chain | S |

### Pillar 3 — AI Stewardship Assistant

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Floating chat window (40/40/40/50px padding rules) | ✅ `chat-rail.tsx`, `features/chat/` | Verify exact padding/positioning vs Figma | S |
| Personalized greeting "Hi, [preferred name]" | 🟡 likely possible from user profile | Confirm preferred-name field captured + used | S |
| Page-contextual prompt ideas (3–5) | 🟡 `prompt_suggestions_cache` table exists | Verify per-page generation pipeline | S–M |
| Streaming + stop control (idle → arrow → square) | ✅ thread_runs + run_events + SSE | Verify stop-button UX states | S |
| Tool-call approval UI | ✅ `tool_call_approvals` table + UI | none | — |
| Full Screen Chat (separate mode, general prompts, 8 starters) | ✅ `app/(app)/chat/page.tsx` | Verify 8-prompt expand/collapse pattern + "Chatting…" lock-out of side rail | S |
| Chat history in left nav (Claude Recents pattern) | 🟡 threads exist; sidebar surfacing unclear | Wire "Chat history" left-nav section | S |
| Context inputs (Living Map + KB + progress) | 🟡 chat works; verify all 3 are injected | Audit system-prompt context assembly | S |

### Pillar 4 — Knowledge Base

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Content table + tagging (topic, phase, format) | ✅ `library_sources` w/ tags + 1536-dim vector index | none | — |
| Ingest 345 Succession Advisors artifacts | ❓ `seed_data/library.json` exists — verify count + coverage | Confirm full ingestion; backfill if partial | S–M |
| Admin tagging UI | ✅ `app/(admin)/library/` | Verify CRUD + tag editor | S |
| Retrieval API (semantic + tag) | 🟡 embeddings stored; retrieval surface unclear | Audit retrieval used by lesson-gen + chat | M |

### Pillar 5 — Documents / Estate

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Upload PDF, list, viewer | ✅ documents + pages + PDFViewer | none | — |
| Smart View (AI summary, expandable rows) | 🟡 documents have `summary`; expandable-row UI unconfirmed | Build Smart View tab w/ row expansion | M |
| Document tab (raw PDF) | ✅ PDFViewer | none | — |
| Version control dropdown (date-versioned) | ✅ `parent_document_id` chaining | Wire date-dropdown UI | S |
| Search w/ blue highlights across both tabs + count badges | ❌ likely missing | Build cross-tab search w/ highlight | M |
| Observations (cards w/ severity, approve/dismiss) | ✅ observations schema + mark-as-read/done | Verify advisor review UI | S |
| Wealth Flow modal (ReactFlow) — multi-agreement selector, share, breadcrumbs | 🟡 `WaterfallState` + waterfall-diagram component | Verify multi-agreement radio selector + share controls | M |

### Pillar 6 — Assets

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Asset summary, YTD, liquidity | ✅ assets + asset_snapshots + liquid/illiquid | Verify YTD calc | S |
| Asset-type filter (Brokerage / PE / RE / Checking / Entities) | ✅ per audit | Verify dropdown matches Figma exactly | S |
| Update via "+ Upload" inside chat window | 🟡 unclear if upload routes through chat | Wire chat-driven upload affordance | S |

### Pillar 7 — Our Team / Professionals

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Internal / External tabs | ✅ professionals table + tabs | none | — |
| Professional New Member Form in chat window | ❌ same gap as Family — no chat-form tool | Build conversational intake | M |
| Per-professional permission grants | 🟡 family_id scoping exists; granular page-permissions per pro unclear | Define + enforce per-page perm flags | M |

### Pillar 8 — Messages

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Inbox / Drafts / Sent | ✅ `features/messages/` + schema | none | — |
| Compose, reply, recipient picker | ✅ compose-modal + recipient-picker | Verify drafts persistence | S |
| Notification badge in nav | ❓ unconfirmed | Add unread-count to nav item | S |

### Pillar 9 — Events

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Calendar + list views w/ toggle | ✅ recent commit `feat(events): list/calendar dual-view` | none | — |
| Create event, attendees, agenda, location | ✅ event-form-modal | none | — |
| RSVP | ✅ rsvp-control | none | — |
| Provost scheduling assistance via chat | ❌ not wired | Add scheduling tool to chat | M |
| Recap (last meeting summary surfaced by Provost) | 🟡 recap-editor exists | Wire chat to read latest recap | S |

### Pillar 10 — App Shell / Home

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Left nav role-aware + hamburger toggle | ✅ sidebar-nav | none | — |
| Header: family last-name, search, Open Chat, chat-bubble (+) | 🟡 header exists | Verify search icon + chat-bubble button match Figma | S |
| Bento home dashboard | ✅ recent commit `feat(home): bento dashboard with grid-auto-flow dense` | none | — |
| Background grid pattern (dotted) + opacity gradient on center panel | ❓ unconfirmed visually | Visual QA pass against Figma | S |
| Active users panel (online indicator) | ❌ not built | Phase 6 deferable; add presence indicator | M |
| Chat history panel (Recents) | ❌ not surfaced in nav | Wire threads → nav section | S |
| Profile dropdown w/ settings + dark mode toggle | 🟡 profile-modal-context exists | Add settings dropdown + dark-mode toggle | S |
| Dark mode | ❌ not implemented (audit confirmed) | Phase 6 — wire theme tokens | M |

### Pillar 11 — Advisor Multi-Family Experience

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Cross-family aggregate dashboard (advisor login default) | ❌ not built per audit | Build advisor home w/ aggregated highlights | M |
| Family-count chip + family selector dropdown top-left | 🟡 family-context cookie exists | Build top-left selector UI | S |
| Per-family permissioned nav | 🟡 ACL exists; UI gating unverified | Verify nav respects family-scoped perms | S |
| Active members per family in left nav | ❌ not built | tied to presence work | M |

### Pillar 12 — Demo Seed (Williams)

| PRD §19 requirement | Repo state | Gap | Lift |
|---|---|---|---|
| 12-person Williams family (Gens 1–3) | ✅ `seed_data/family.json` | Reconcile names — PRD §19 lists Robert/Linda/David/Susan/Jennifer/Michael + 6 grandchildren; ADR mentions different names (Margaret, Elizabeth Harper). Pick canonical set. | S |
| 3 professionals (Mike Harrington / Sarah Lin / David Johnson) | ✅ `seed_data/professionals.json` | Verify names match PRD §19.2 | S |
| Sample documents (RLT, Dynasty, GRAT, CRUT, ILIT, IDGT, FLP/LLC, Will, Pour-Over, Constitution, Charter, LOI) | 🟡 `seed_data/documents.json` | Verify all 12–13 docs present + linked to Drive folder | S |
| Sample observations (Discrepancy #1 pour-over date, Discrepancy #2 ILIT trustee) | 🟡 observations schema present | Seed the two intentional discrepancies w/ severity + recommended action | S |
| ~$92.4M assets snapshot | 🟡 assets schema present | Verify seed totals | S |

### Pillar 13 — Non-Functional

| PRD requirement | Repo state | Gap | Lift |
|---|---|---|---|
| Chat <3s, page <1s | ❓ no perf budget enforced | Add Lighthouse + chat TTFT monitoring | S |
| Encryption at rest / in transit | 🟡 Convex + Vercel TLS by default; no per-family KMS keys (ADR-3 deferred by stack choice) | Document trust boundary; per-family keys not feasible on Convex | doc-only |
| RBAC via custom claims | ✅ Clerk + `requireFamilyMember` | none | — |
| Strict family isolation | ✅ row-scoping on every table | Add automated test asserting cross-family denial | S |
| Audit logging | ✅ `audit_events` table | Verify coverage on sensitive ops | S |
| SOC 2 readiness | 🟡 docs/deploy/post-launch-audit.md exists | Run through 9-item checklist | S |

---

## 2. Out-of-scope-for-beta (per `beta-scope-request.md` and ADR §"What's deferred")

These are doc-prescribed but explicitly deferred — **do not build for beta**:

- Listen / Watch lesson modalities (NotebookLM)
- Mobile apps (iOS/Android)
- Protopia privacy layer
- Full automated document → knowledge-graph pipeline
- Multi-advisor collaboration
- Real-time co-presence ("Active" users live chat)
- Plaid/Addepar integrations

---

## 3. Stack divergence (the elephant)

The two architecture docs prescribe **three different stacks** *between themselves*:

- `Provost AI — Technical Roadmap.md` says Supabase + AWS + OpenAI
- `2026-04-07-provost-v1-architecture.md` says GCP + Firebase Auth + Postgres + Drizzle + Vercel AI SDK
- `backend-map.md` describes a separate FastAPI + Postgres + Redis service deployed to AWS ECS

The **actual repo** is Vercel + Next.js + Convex + Clerk + OpenAI. None of the three doc stacks match.

**Implication.** If you literally "bring the codebase in alignment with the docs," you are doing a **full rewrite from Convex to Postgres + a new auth provider + a new host**. That is 3–6 months of work for *zero* user-visible value, and it discards a working system.

The architecturally sound move is the inverse: **rewrite the docs to reflect Convex.** The Convex choice gives you transactional row-scoping, a built-in scheduler/cron system, vector search, and reactive queries — all of which the PRD requires and which currently work.

What changes if you keep Convex:
- ADR-3 (per-family DBs + per-family KMS) becomes "row-scoped multi-tenancy + Convex's at-rest encryption." Different compliance story; still defensible for UHNW.
- ADR-4 (Firebase Auth) becomes "Clerk." Roles are already mapped.
- ADR-5 (Vercel AI SDK) — you may still want to adopt this, since it's provider-agnostic. Currently you're calling OpenAI directly. **Recommended adoption** — small lift (M), strategic value high.
- ADR-8 (Drizzle/pgvector) becomes "Convex schema + Convex vector index." Already in place.
- backend-map.md — **delete or archive**; it describes a system that doesn't exist in this repo.

---

## 4. Recommended path forward

### A. Doc reconciliation (1–2 days)
1. Mark `backend-map.md` and `frontend-map.md` as **archival** — they describe a prior FastAPI/separate-frontend split that has been superseded.
2. Mark Roadmap's Phase 1 (Supabase) as **superseded** by ADR.
3. Write a short ADR-9 "Convex over Postgres+Drizzle" explaining the reversal, and rev the V1 Architecture doc to match Convex realities.
4. Apply Brad's 9 curriculum edits after sign-off.

### B. Beta-blocking gaps to close (estimated ~3–5 weeks of dev)
Sized for one engineer; parallelizable.

| # | Gap | Lift | Why beta-blocking |
|---|---|---|---|
| 1 | Conversational New Member Form (chat tool for Family + Professionals) | M | PRD §16.7 + §16.9 — the core onboarding UX |
| 2 | Page-contextual prompt ideas verified end-to-end (3–5 per page) | S–M | PRD §16.2 — defining chat UX |
| 3 | Stewardship-phase auto-assign rules + advisor override UI | S | PRD §6.1 step 3 |
| 4 | Lesson "2-at-a-time" delivery cadence trigger | M | Roadmap Phase 4 done-criteria |
| 5 | 4-format progress-circle icons on lesson preview | S | PRD §16.6 visual spec |
| 6 | End-of-article controls (👍/👎 / Feedback / Share / You might also enjoy) | S–M | PRD §16.6 |
| 7 | Smart View expandable-row UI + cross-tab search w/ highlight | M | PRD §16.8 (Estate) |
| 8 | Two seeded observations (pour-over date, ILIT trustee) | S | PRD §19.4 — the "wow" demo |
| 9 | Williams family roster reconciliation (PRD vs ADR mismatch) | S | demo correctness |
| 10 | Advisor cross-family dashboard + family-selector chip | M | PRD §18 |
| 11 | Dark mode + chat-history nav section + active-users dot | M | PRD §16.1 / §16.3 |
| 12 | Vercel AI SDK adoption (replace direct OpenAI calls) | M | strategic — lets you swap providers without code change; ADR-5 |
| 13 | Cross-family isolation test in CI | S | non-negotiable for SOC 2 §"Family data isolation" |

**Total estimated lift: ~15–25 engineer-days** for beta-readiness against the PRD (assuming the audit's "✅ built" labels hold up under visual QA — budget +20% for Figma fidelity work).

### C. Out of beta scope, schedule for V2
- Listen / Watch (NotebookLM)
- Active users live chat
- Granular per-page permissions for external professionals
- Provost-as-meeting-host scheduling tool
- Full automated document → entity extraction pipeline

---

## 5. Bottom line

Coverage against the PRD product surface: **~80–85% built**, mostly polish + a handful of feature-specific gaps remain.

Coverage against the *docs as written* (architecture stack): **~0%** — but that's the docs being wrong, not the code. Don't chase it.

The realistic "alignment" lift is **2–3 days of doc rewrites + ~3–5 weeks of feature gap closure**, not a stack migration.

---

## 6. Additional signal from the broader Provost vault

Source: `Dropbox/Provost/` (Obsidian vault root) — `CLAUDE.md`, `TASKS.md`, `Maps/`, `Concepts/`, `Design/`, `Beta/`, `Hopper/`. This is Brad's working state, not new product spec, but it surfaces concrete items the §1 matrix didn't capture.

### 6.1 Linear tickets already filed (vault `CLAUDE.md`)

These are real, named, prioritized — fold them straight into the beta-polish queue. Most map to existing gaps in §1; treat the ticket numbers as tracking IDs.

| Ticket | Pri | What | Maps to §1 row | Lift |
|---|---|---|---|---|
| PRO-133 | **High** | Full-screen chat mode — Figma has 6 frames, only docked panel exists | Pillar 3 (Full Screen Chat) | S–M |
| PRO-134 | Med | Header "Open Chat" / "Close Chat" toggle button | Pillar 3 (verify state machine) | S |
| PRO-128 | Med | Family page missing tabs: **Fun Facts / History / Values** | **NEW** — not in §1 | M |
| PRO-131 | Med | Lesson card progress bars | Pillar 2 (4-format progress circles) | S |
| PRO-132 | Med | Estate agreement cards missing author/date metadata | Pillar 5 (version dropdown) | S |
| PRO-135 | Med | Education Progress tab needs **stewardship-phase line chart** | Pillar 2 (Progress tab visualization) | S–M |
| PRO-136 | Med | Messages should be **3-column layout** (list + reading pane + chat) | Pillar 8 (Messages refinement) | M |

**New scope item to add to §1:** Family page Fun Facts / History / Values tabs (PRO-128). Repo has `/fun-facts/[funFactId]` route per the legacy frontend-map; need to confirm Family-page tab structure on the live Convex/Next code and add History + Values surfaces if missing.

### 6.2 Feature Gate runtime pattern (vault `Concepts/Feature Gate.md`)

A runtime gating mechanism specced but not surfaced in §1.

- **Component:** `<FeatureGate feature="...">` wrapper around every module.
- **States:** `real` (show), `launching_soon` (blurred overlay), `disabled` (hidden).
- **Default posture:** all modules `launching_soon`. Demo families (Williams) bypass; real families see the overlay.
- **Why it matters:** lets you onboard the 2–3 beta families on a polished subset without hiding modules globally. Critical for beta cutover — flip one module at a time as it lands.

**Action:** Verify a `FeatureGate` component (or equivalent gating) exists in `apps/web/src/components/`. If absent, build it (~S lift). If present, audit the config map to confirm Williams bypass + per-family overrides work. Add to §4.B as item #14.

### 6.3 Generation Tone — explicit AI personalization spec (vault `Concepts/Generation Tone.md` + `lesson-modalities.md`)

Three-tier tone calibration that should drive system prompts and lesson generation, not just be ambient.

| Generation | Age | Tone | Sample voice |
|---|---|---|---|
| Gen 1 | 60+ | Formal, comprehensive | "A detailed analysis of your Dynasty Trust provisions" |
| Gen 2 | 35–55 | Professional, practical | "Understanding your family's estate tax obligations" |
| Gen 3 | 16–30 | Relatable, visual-first | "What happens to your family's money?" |

**Action:** Audit `convex/agent/` and `convex/lib/` (or wherever the OpenAI system prompt is assembled) — confirm Gen 1/2/3 tone is injected based on member age + stewardship phase. Likely a S–M lift to wire if not present. Applies to:
- Provost Assistant chat responses
- Lesson generation pipeline (article tone)
- UI microcopy where the user is addressed by name

Add to §4.B as item #15.

### 6.4 Provost AI vision — four capabilities (vault `CLAUDE.md` + `Concepts/Provost AI Assistant.md`)

The assistant's product roadmap, beyond the PRD's "context-aware Q&A":

1. **Page awareness** — partial today; chat knows current page. → already in §1 Pillar 3.
2. **Content highlighting** — *future*; Provost highlights specific clauses/items in the document. → Maps to Pillar 5 Smart View; not on V1 critical path but worth a placeholder in V2.
3. **Content manipulation** — *future*; Provost drafts notes, adds events, invites members via tool calls. → Partly enabled by your `tool_call_approvals` infra; **the New Member Form chat tool (§1 Pillar 1 #5 + Pillar 7 #2) is the first concrete instance**.
4. **Proactive suggestions** — *future*; Provost notices issues and offers help unprompted. → V2.

**Action:** None for beta. But when scoping the chat-tool work in §4.B item #1, frame it as the first delivery of capability #3 — it sets the pattern for events/notes/observations as future tools.

### 6.5 Brad's open beta-blocker decisions (vault `TASKS.md` + `Beta Launch MOC.md` + `Open Questions MOC.md`)

These are **product decisions Brad owes**, not eng work — but they gate scope. They're not in §1 because they aren't features.

- Beta scope doc (in/out for April 15) — **still owed**
- AI chat in beta, or lessons-only? — **decision pending**
- 2–3 beta families: names, contacts — **TBD**
- Beta success criteria (completion %, engagement signal) — **TBD**
- Which content from the 345 artifacts ships first — **TBD**
- Walk through `education-brad-feedback.md` 9 margin notes with Tyler, accept/reject each — **TBD**
- Listen mode API choice (NotebookLM vs Gemini + TTS) — **deferred to weeks 2–3**
- Pre-generate vs on-demand lessons — **TBD** (cost/latency tradeoff)

**Action:** Surface this list to Brad as a single decision queue. Each item blocks something downstream. The first three are the hardest blockers (no scope = no acceptance criteria; no families = no onboarding rehearsal).

### 6.6 Design assets — the actual Figma rendered frames

`Dropbox/Provost/Design/` contains **68 PNG exports** of the Figma frames the PRD links to. The PRD references them by URL; offline copies live here. Frames named `*Robert Beta*` are the **canonical April-15 design target** per `Design MOC.md`.

**Modules covered in the export set:** Home (3 variants), Education (10+ frames including Article Style, Family Progress, Lesson Preview, Programs Open/Closed), Family (tree modal + new-member form variants), Estate (Wealth Flow, RLT Smart View, Document, Search), Assets, Messages (3 variants), Events, Our Team, Advisor View (Williams, Families Dropdown, Create/Add New Family, Events), Full-Screen Chat (6 frames covering Prompt Ideas, Selected, Texted, Thinking, Response, default).

**Confirmed design decisions (from `Design MOC.md` and vault `CLAUDE.md`) — don't relitigate:**

- White background everywhere. **No cream.** (This contradicts the V1 architecture doc's "warm tones, cream" — the design has moved on.)
- Fonts: **Fraunces** (display) + **Source Serif 4** (body) + **Geist** (sans). The V1 architecture doc and PRD don't name fonts; this is the answer to Roadmap Open Question #6.
- Chat panel is a **docked side panel** (not floating overlay per PRD §16.2). **Collapses to strip with expand arrow.** This is a non-trivial divergence from the PRD — confirm the repo's `chat-rail.tsx` is docked-not-floating.
- Markdown supported in tile bodies.
- DB is the source of truth — seed only bootstraps fresh DBs.

**Action:** Add a §1 Pillar 10 row: **Confirm chat panel is docked-collapsible-strip, not floating-with-padding** — the PRD §16.2 spec (40/40/40/50 padding floating box) is **superseded** by the design decision in `Design MOC.md`. Lift S to verify; could already be correct.

**Action:** Resolve Roadmap Open Question #6 (fonts) — answer is Fraunces + Source Serif 4 + Geist. Verify these are loaded in `apps/web/src/app/layout.tsx` and applied via Tailwind tokens.

### 6.7 Stale stack signal in the vault itself

The vault has the same stack-divergence problem as `Product/`. Three files reference systems that don't match the actual repo and should be flagged stale:

| File | Stale claim | Reality |
|---|---|---|
| `CLAUDE.md` (vault root) | Repo is `github.com/sanctifai/app.familyprovost.com`; stack is Firebase Auth + Drizzle + Postgres + pgvector | Repo is `provost/`; stack is Convex + Clerk + Vercel |
| `CLAUDE.md` | Demo logins `robert.williams@example.com / williams12345` | Likely doesn't apply on Clerk; verify |
| `Maps/Architecture MOC.md` | "Backend: FastAPI, SQLAlchemy async, PostgreSQL 17 + pgvector, Redis. Auth: Firebase Auth" | None of this is in the Convex repo |
| `Beta/onboarding-checklist.md` | "Fix prod deployment (entrypoint wipes DB — blocker)" | That's the legacy FastAPI bug from `backend-map.md`; doesn't apply to Convex |

**Action:** When you do the §4.A doc reconciliation, do the same pass on the vault — rev `CLAUDE.md`, `Architecture MOC.md`, and `Beta/onboarding-checklist.md` to reflect the Convex/Clerk/Vercel reality. Otherwise Brad and any agent reading the vault will continue to act on phantom infrastructure.

### 6.8 Empty / inbox-only — no signal

- `Hopper/` — intake only, currently empty
- `Content/Succession Advisors/` — **the 345 artifacts have not landed here yet** (per `Hopper/README.md` priority list). This is a real blocker: no artifacts → no lesson generation → no beta launch on April 15.
- `Content/Lessons/` — empty (output destination)
- `Beta/Families/` — empty (no family contacts captured)
- `Source Lessons/` — single PDF: "PDF Operating - CFO-Level Financial Decision Making.pdf" (one of 345; not the full set)

**Action:** Track artifact intake as a top-line beta blocker — it's not a code gap but it gates the whole content pipeline. If 345 artifacts won't be ready, define a smaller bootstrap set (e.g., 20 lessons covering the 4 phase Core tracks) so beta isn't blocked on bulk ingestion.

### 6.9 Updated total lift

Folding in §6 findings, the beta-polish queue grows from 13 items to **~17**:

| Added | Source | Lift |
|---|---|---|
| Family page Fun Facts / History / Values tabs (PRO-128) | §6.1 | M |
| Verify / build FeatureGate runtime pattern w/ Williams bypass | §6.2 | S |
| Wire Generation Tone (Gen 1/2/3) into system prompts + lesson gen | §6.3 | S–M |
| Verify chat panel is docked-collapsible (not floating) per `Design MOC` | §6.6 | S |
| Confirm fonts Fraunces + Source Serif 4 + Geist loaded | §6.6 | S |
| Vault doc rewrite (`CLAUDE.md`, `Architecture MOC.md`, `Beta/onboarding-checklist.md`) | §6.7 | folded into §4.A |

**New total estimated lift: ~20–28 engineer-days** for beta-readiness, plus 2–3 days of doc/vault rewrites.

The non-engineering blockers (Brad's 8 product decisions in §6.5 + 345-artifact intake in §6.8) sit in parallel and are the more likely critical path to April 15.
