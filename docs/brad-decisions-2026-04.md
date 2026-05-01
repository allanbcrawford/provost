# Brad's Decision Queue — Beta Parity (April 2026)

**Owner:** Brad Lawler
**Target resolution:** rolling, but blockers must be cleared by **2026-05-07** (5 working days from 2026-04-30)
**Why this exists:** Engineering can move in parallel on most of the beta plan, but eight product decisions gate specific issues. This file lists each one with a recommended default that eng will adopt if Brad doesn't respond by the deadline. Silence = consent on defaults.

---

## Decision Status Legend

- 🔴 Blocking — eng work cannot proceed without an answer
- 🟡 Needed soon — work can start but acceptance criteria depend on this
- 🟢 Defaultable — eng will adopt the recommended default if no answer

---

## The Queue

### 1. Beta scope: what's in vs. out for April 15

**Status:** 🔴 Blocking
**Blocks:** Issues 0.1, 1.1, 7.2 — audit pass, FeatureGate configuration, and SOC 2 checklist all require a locked scope boundary
**Source:** `Dropbox/Provost/Product/beta-scope-request.md`; `TASKS.md` §Beta Blockers

**The question:** Which product modules are enabled for the 2–3 beta families on April 15? The scope doc you owe Tyler has never arrived.

**Context:** The FeatureGate component wraps every module and flips individual features to "launching soon" or "real." Without a written scope decision, the eng team cannot set the right gate states before onboarding families and cannot write acceptance criteria for the audit pass. Everything in Phases 1–7 is implicitly scoped by this answer.

**Options:**
1. Education-first: Read-mode lessons + AI chat + Living Map core; Estate/Documents/Assets behind "launching soon"
2. Full parity: all seven modules live for beta families, polish varies
3. Custom list: Brad specifies which modules are live

**Recommended default if no response:** Education (Read mode lessons) + AI chat + Living Map are live; Estate, Assets, Messages, and Events modules gated as "launching soon." Tyler's recommendation from `beta-scope-request.md` plus the implementation plan scope.

---

### 2. AI chat in beta, or lessons only?

**Status:** 🔴 Blocking
**Blocks:** Issue 4.1 (full-screen chat), Issue 4.3 (page-contextual prompt ideas), Issue 1.1 (FeatureGate config for chat module)
**Source:** `Dropbox/Provost/Product/beta-scope-request.md` open question; `Open Questions MOC.md`

**The question:** Does the beta include the Provost AI assistant, or is it a read-mode lessons-only experience?

**Context:** Chat is already working in production. Shipping without it means delivering a materially worse product than the team has already built. The counter-argument (Brad's implicit hesitation) is that chat opens liability around financial advice in a beta with real families. This is the most consequential binary in the whole scope.

**Options:**
1. AI chat included — full Provost assistant, page-contextual prompts, full-screen mode
2. Lessons-only — no chat UI visible in beta
3. AI chat included but scoped to education questions only (guardrail in system prompt)

**Recommended default if no response:** AI chat IS in beta (option 1). Shipping a working assistant to beta families is higher signal than shipping a stripped product, and the financial advice guardrail can be enforced via system prompt without additional eng work.

---

### 3. The 2–3 beta families: names and contacts

**Status:** 🔴 Blocking
**Blocks:** Issues 0.1 (Figma QA with real use cases), 1.1 (per-family FeatureGate config), 7.2 (SOC 2 — data scope requires knowing who's in the system)
**Source:** `TASKS.md` §Beta Blockers; `Beta/Families/` directory is empty

**The question:** Who are the beta families? What are their names and the primary contact for each?

**Context:** `Beta/Families/` in the vault is empty. Without concrete family names, eng cannot configure Clerk, run onboarding rehearsals, or test per-family isolation against real-world accounts. This also gates any demo or advisor walkthrough scheduled before April 15. This is the hardest blocker in the queue — nothing can be rehearsed without it.

**Options:** Brad has family relationships in mind. This one cannot be defaulted.

**Recommended default if no response:** None possible. This is the one item in the queue that requires a real answer. If Brad has even one name and a contact email by May 7, onboarding can start.

---

### 4. Beta success criteria

**Status:** 🟡 Needed soon
**Blocks:** Issue 7.2 (SOC 2 audit + beta readiness checklist), Issue 7.3 (perf instrumentation — need to know what to measure)
**Source:** `TASKS.md` §Beta Blockers; `Open Questions MOC.md`

**The question:** What signals make the beta a success? Specific metrics needed: completion rate, engagement frequency, qualitative threshold.

**Context:** Without defined success criteria, the team cannot configure the right analytics, and the beta has no clear graduation criteria to V1 production. This affects how the progress tab and engagement instrumentation are built in Issues 3.3 and 7.3.

**Options:**
1. Completion-based: X% of assigned lessons completed within Y weeks
2. Engagement-based: active sessions per week per family member
3. Qualitative: advisor and family member satisfaction rating after 30 days
4. Combination of the above

**Recommended default if no response:** Completion rate ≥50% of assigned lessons + at least 2 active sessions per family member per week + one structured qualitative check-in at 30 days.

---

### 5. Content prioritization: which artifacts ship first

**Status:** 🟡 Needed soon
**Blocks:** Issue 3.4 (lesson delivery cadence — which tracks are active for beta families), Issue 3.5 (curriculum edits)
**Source:** `TASKS.md` §Beta Blockers; `gap-analysis §6.8`

**The question:** The 345 Succession Advisors artifacts are already ingested in Convex `library_sources`. Which content should be prioritized for the first lesson cohort assigned to beta families?

**Context:** Artifact intake is done — this is a sequencing decision, not a technical one. The curriculum has four programs and roughly 88 lessons. Beta families will start with a 2-at-a-time delivery cadence; someone needs to decide which tracks they start on. Without this, the implementation plan cannot wire the initial learning path assignment in Issue 3.4.

**Options:**
1. Start all beta families in Emerging Steward program (broadest onboarding)
2. Brad selects one priority track per stewardship phase
3. Advisor assigns tracks manually per family member at onboarding

**Recommended default if no response:** Beta families start with Core lessons in the track matching their stewardship phase (auto-assigned per Issue 2.2 age rules). Advisors can override at onboarding.

---

### 6. Curriculum margin notes: accept or reject each of the 9 edits

**Status:** 🟡 Needed soon
**Blocks:** Issue 3.5 (curriculum migration script) — it is staged and ready but will not run until Brad signs off
**Source:** `Dropbox/Provost/Product/education-brad-feedback.md`; `gap-analysis §1 Pillar 2`

**The question:** Brad annotated the curriculum spreadsheet with 9 changes. Each needs an explicit accept or reject before the migration script runs. The DB currently reflects the original curriculum exactly.

**Context:** The 9 edits are detailed in `education-brad-feedback.md`. They include moves (Building Blocks → Operating), renames (Powers of Attorney), splits ($27.98M Window → two Core lessons), priority changes (Dynasty Trusts Core → Extended), and one deletion (Across Borders). These are good edits — they reflect current law and cleaner pedagogy. The migration script is idempotent and safe to re-run.

**Options:** Walk through the list with Tyler, confirm each edit, and eng runs the migration the same day.

**Recommended default if no response:** All 9 edits APPLY. Brad's notes are clear and consistently reflect his intent. Absence of an explicit reject will be treated as acceptance. Eng will run the migration by May 7.

---

### 7. Listen mode API choice: NotebookLM vs Gemini + TTS

**Status:** 🟢 Defaultable — not blocking April 15
**Blocks:** Listen-mode work, which is explicitly deferred to weeks 2–3 post-launch per `lesson-modalities.md`
**Source:** `Dropbox/Provost/Product/lesson-modalities.md` open questions; `Open Questions MOC.md` §Education delivery

**The question:** When Listen mode ships (post-beta), which Google Cloud API generates the podcast audio?

**Context:** NotebookLM API produces two-host conversational audio natively — closer to the original product vision. Gemini + TTS is more controllable and likely cheaper per lesson, but the output is less engaging. This decision has zero impact on April 15. It is on this list because it will block a Phase 16 sprint if not resolved before that work starts.

**Options:**
1. NotebookLM API — conversational, high quality, less cost-control
2. Gemini (summarize) + TTS (voice) — modular, more control, lower fidelity
3. Evaluate both with a test batch before committing

**Recommended default if no response:** Defer the decision. Eng will spike both APIs in a throwaway branch during weeks 2–3 beta. Brad reviews output samples and picks. No default adopted until then.

---

### 8. Lesson generation timing: pre-generate vs on-demand

**Status:** 🟢 Defaultable
**Blocks:** Issue 3.4 (delivery cadence architecture) — the generation timing decision shapes how that issue is built
**Source:** `Dropbox/Provost/Product/lesson-modalities.md` open questions; `plans/progress.json` §decisions

**The question:** Should lessons be pre-generated when a learning path is assigned, or generated on-demand when a family member opens the lesson?

**Context:** On-demand is simpler to build and avoids generating content no one reads. Pre-generate gives sub-second page loads and predictable OpenAI costs. The PRD specifies a <1s page-load requirement — on-demand generation (typically 3–8 seconds for a full article) violates this at cold load. The implementation plan already recommends pre-generate as the default.

**Options:**
1. Pre-generate at path-assignment — all lessons generated when advisor assigns a track; cost paid upfront
2. On-demand with aggressive caching — first load is slow; subsequent loads are cached
3. Hybrid — pre-generate Core lessons, on-demand for Extended/Exploratory

**Recommended default if no response:** Pre-generate at path-assignment (option 1). Cost predictability + the <1s load requirement together justify this. Eng will implement accordingly.

---

## Tracking

| # | Decision | Status | Default-by | Resolved | Brad's answer |
|---|---|---|---|---|---|
| 1 | Beta scope (in/out April 15) | 🔴 Blocking | 2026-05-07 | — | — |
| 2 | AI chat in beta or lessons-only | 🔴 Blocking | 2026-05-07 | — | — |
| 3 | Beta family names + contacts | 🔴 Blocking | 2026-05-07 | — | — |
| 4 | Beta success criteria | 🟡 Needed soon | 2026-05-07 | — | — |
| 5 | Content prioritization for first lesson cohort | 🟡 Needed soon | 2026-05-07 | — | — |
| 6 | 9 curriculum margin notes: accept/reject | 🟡 Needed soon | 2026-05-07 | — | — |
| 7 | Listen mode API (NotebookLM vs Gemini + TTS) | 🟢 Defaultable | weeks 2–3 post-launch | — | — |
| 8 | Pre-generate vs on-demand lessons | 🟢 Defaultable | 2026-05-07 | — | — |

To mark a decision resolved: replace `—` in the Resolved column with a date and fill Brad's answer. Eng will update the corresponding issue's `blockedBy` field in `plans/progress.json` and unblock the issue.
