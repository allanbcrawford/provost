# V1 Next Six — Implementation Plan

Six tasks to push beta from "shaped but skeletal" to "feels like a real product." Sequenced for foundation-first, then parallelizable wins, with the largest engineering lift last.

## Sequencing rationale

```
#6 → (#4 ‖ #5 ‖ #3) → #1 → #2
```

- **#6 first.** Page-context wiring is foundational and small. It makes #1 (lesson editor) and every other page-tied chat surface meaningfully smarter the moment it lands. Shipping it before the form work means those forms inherit context for free.
- **#4, #5, #3 in parallel.** All three are "fill the empty UI" jobs against backends that already exist. Each is small enough to land in one focused session.
- **#1 after #6.** The in-browser lesson editor leverages page-context wiring — admins editing a lesson can ask the agent about it inline without re-plumbing.
- **#2 last.** Real waterfall engine math is the only multi-day item and deserves dedicated planning. Other UX surfaces should be stable first so we're not chasing two moving targets.

---

## Task 6 — Page-context wiring (~3 hours)

**Goal:** detail pages register their `selection` and `visibleState` in chat context. The chat send path passes both into `useRun`, so the agent receives `{route, selection, visibleState}` on every send.

**Why it matters:** today the agent only knows the route. Wiring `selection` (kind + id) + `visibleState` (the data the user is currently looking at) lets the agent answer "what does this clause mean?" without the user re-pasting context.

**Files to change:**
- `apps/web/src/features/chat/chat-panel-context.tsx` — extend with `selection`, `visibleState`, and setters. Stable identity via `useMemo`.
- `apps/web/src/hooks/use-page-context.ts` — NEW. `usePageContext({ kind, id, state })` registers on mount, clears on unmount.
- `apps/web/src/components/chat-rail.tsx` — read selection + visibleState from context, pass into `send()`.
- `apps/web/src/app/(app)/chat/page.tsx` — same wiring for full-screen chat.
- `apps/web/src/hooks/use-run.ts` — confirm `send` accepts `selection` + `visibleState` (already partially wired); plumb through to mutation.
- `convex/agent/run.ts` — accept and persist on the run record (already partially wired in earlier work; verify).

**Pages to instrument:**
- `/documents/[documentId]` — `{ kind: "document", id }`, visibleState includes title + version.
- `/lessons/[lessonId]` — `{ kind: "lesson", id }`, visibleState includes track + program + quiz state.
- `/signals/[id]` (if route exists; otherwise the detail drawer) — `{ kind: "signal", id }`.
- `/family` (member detail panel open) — `{ kind: "family_member", id }`.
- `/events/[id]` (lands as part of #5) — `{ kind: "event", id }`.
- `/simulations/...` waterfall modal — `{ kind: "waterfall", id: "scenario:<hash>" }`, visibleState includes selected agreements + customEdits.

**Verification:**
1. Open a document detail page, send a chat message. Inspect the run record in Convex — `selection.kind === "document"` + matching id.
2. Close the page, open chat at `/family`. Selection cleared; visibleState replaced.
3. Hard-refresh on a detail page; selection re-registers within one render.

---

## Task 4 — Asset add-form (~2 hours, Tier 1 only)

**Goal:** modal-driven manual asset entry from `/family/assets`. Tier 2 PDF upload deferred.

**UX:**
- "Add asset" button in `assets-list.tsx` header.
- Modal fields: name (required), type (select from `ASSET_TYPES`), value (number), currency (default USD), as_of_date (date picker, default today), liquidity tag (optional: liquid / illiquid).
- Submit → `api.assets.create` (already exists). On success, modal closes, list invalidates via Convex live query.

**Files:**
- `apps/web/src/features/assets/asset-form-modal.tsx` — NEW.
- `apps/web/src/features/assets/assets-list.tsx` — wire button + modal state.
- `convex/assets.ts` — confirm `create` accepts liquidity tag; add if missing.

**Verification:** add an asset as admin, see it appear in list + summary chart. Member without `assets` role should not see the button.

---

## Task 5 — Event create-form + RSVP detail + recap (~2 hours)

**Goal:** make `/events` actually creatable in-browser.

**UX:**
- "New event" button → modal with title, description, start, end, location_type (in_person / video), location_detail, agenda (textarea), attendees (multiselect over family members + family-scoped professionals).
- Event detail drawer (or page) shows attendee list with their `rsvp_status` and an inline RSVP control for the current user.
- Below recap section: textarea + "Save recap" button (admin/advisor only). Once saved, displays as a read-only block with "Edit" affordance.

**Files:**
- `apps/web/src/features/events/event-form-modal.tsx` — NEW.
- `apps/web/src/features/events/event-detail.tsx` — NEW (drawer or panel).
- `apps/web/src/features/events/rsvp-control.tsx` — NEW.
- `apps/web/src/features/events/recap-editor.tsx` — NEW.
- `apps/web/src/app/(app)/events/page.tsx` — wire button + detail open state.
- `convex/events.ts` — confirm `create`, `rsvp`, `setRecap` already exist (they do per summary).

**Verification:** create an event with two attendees; each sees it in their list and can RSVP. Admin sets recap; members see the recap text.

---

## Task 3 — Messages compose-new-thread modal (~3 hours)

**Goal:** the missing "compose" button on `/messages`.

**UX:**
- "New message" button → modal.
- Recipient picker: typeahead over family members + family-scoped professionals. Multi-select. Shows role badges.
- Subject (required), body (textarea, supports basic line breaks).
- "Save draft" (writes via `api.messages.saveDraft`) and "Send" (writes via `api.messages.sendMessage`, which already creates the thread + grants party rows).
- On send, modal closes and we navigate to the new thread.

**Files:**
- `apps/web/src/features/messages/compose-modal.tsx` — NEW.
- `apps/web/src/features/messages/recipient-picker.tsx` — NEW.
- `apps/web/src/app/(app)/messages/page.tsx` — wire button.
- `convex/messages.ts` — verify `sendMessage` returns the new thread id (used for navigation).
- `convex/users.ts` / `convex/professionals.ts` — confirm a query exists that returns "people I can DM in this family." Add `listMessageableContacts` if not.

**Verification:** Family A admin DMs Family A member → both see thread in their respective Inbox tabs. Family B member does not see it. Drafts visible in Drafts tab and resumable.

---

## Task 1 — In-browser lesson editor (half day)

**Goal:** site-admins curate lessons end-to-end without a CLI. Lives at `/library/lessons/[lessonId]/edit` (or as a tab on the lesson detail page within the `(admin)` route group).

**UX:**
- Three-section editor:
  1. **Metadata**: title, description, track (read-only context), stewardship phase (inherited from program).
  2. **Article body**: split-pane Markdown editor with live preview (use `@provost/ui` Markdown for preview).
     - "Regenerate from slides" button — calls `api.learningBackfill.migrateArticles` scoped to one lesson.
  3. **Quiz**: list of questions, each with prompt + 4 choices + correct index + explanation. Add / remove / reorder questions. Pass-score input.
- Save splits into three mutations: `lessons.updateMetadata`, `lessons.updateArticle` (already exists), `quizzes.upsertForLesson` (already exists).
- "Open in chat" affordance using #6 — agent has `selection.kind = "lesson"` and the current draft body in `visibleState`, so admins can ask "tighten this paragraph" inline.

**Files:**
- `apps/web/src/app/(admin)/library/lessons/[lessonId]/edit/page.tsx` — NEW.
- `apps/web/src/features/lessons/lesson-editor.tsx` — NEW (split pane).
- `apps/web/src/features/lessons/quiz-editor.tsx` — NEW.
- `apps/web/src/features/lessons/markdown-editor.tsx` — NEW (textarea + Markdown preview side-by-side).
- `convex/lessons.ts` — add `updateMetadata` (admin/advisor gate) for title/description/format.
- `convex/learningBackfill.ts` — extract single-lesson `regenerateArticleForLesson` mutation if convenient.

**Permissions:** site-admin only (gate at the page level using existing `is_site_admin` check, since lesson curation is platform-level not family-level).

**Verification:** site-admin edits article body, saves, member sees updated content on `/lessons/[id]`. Site-admin updates quiz, member's next attempt grades against new questions. Non-admin hitting the URL gets 403.

---

## Task 2 — Real waterfall engine math (multi-day)

**Goal:** replace the placeholder 90% allocation with real per-document math driven by each agreement's structured state.

**Approach (to be confirmed in dedicated planning session before code):**
1. **Document state shape.** Pick a structured `waterfall_state` schema for `documents.state`: top-level beneficiaries (with shares as percent or fixed amount), per-asset overrides, contingent paths (death-order branches), and a `priority_class` (revocable_trust=0, irrevocable=1, will=2).
2. **Backfill / extraction.** For Williams demo docs: hand-author the state blobs once. For new docs going forward: LLM extraction action that populates `waterfall_state` from PDF text, behind admin approval.
3. **Engine.** New `convex/waterfallEngine.ts`:
   - Input: `{ familyId, selectedDocumentIds, deathOrder, customEdits }`.
   - Loads documents, sorts by priority_class, applies trust-supersedes-will rule.
   - Computes per-asset allocation by walking each document's state. Tracks unallocated remainder.
   - Returns `{ flows: Edge[], unallocated: number, perBeneficiaryTotals: ... }`.
4. **Diagram.** `waterfall-diagram.tsx` renders `flows` instead of the hand-coded structure. The "Current" vs "Revised" panes share the engine but pass different revision flags.

**Files (sketch, will firm up in planning session):**
- `convex/schema_parts/domain.ts` — extend `documents.state` shape via a documented type alias (no schema change needed since `state` is `v.any()`).
- `convex/waterfallEngine.ts` — NEW.
- `convex/agent/tools/extractWaterfallState.ts` — NEW (approval-gated).
- `apps/web/src/features/waterfall/waterfall-diagram.tsx` — rewrite to consume engine output.
- `apps/web/src/features/waterfall/unallocated-summary.tsx` — replace the 90% placeholder with real engine numbers.

**Risks:**
- Schema shape for `waterfall_state` is the biggest decision; getting it wrong means a second migration. Plan a half-day workshop on this before coding.
- Demo doc state authoring is tedious. Worth it for fidelity but should be tracked separately.

**Verification:** select a single will → unallocated reflects assets not enumerated. Add a revocable trust covering 80% of estate → trust assets removed from will scope. Toggle death order → contingent branches surface different terminal beneficiaries.

---

## What lands on `main` after each step

| Step | Commit theme | Visible to user |
|------|--------------|-----------------|
| #6 | `feat(chat): page-context wiring` | Agent answers feel sharper on detail pages. |
| #4 | `feat(assets): manual add form` | "Add asset" button works. |
| #5 | `feat(events): create + RSVP + recap` | "New event" button works; recap surfaces post-meeting. |
| #3 | `feat(messages): compose modal` | "New message" button works. |
| #1 | `feat(library): in-browser lesson editor` | Site-admins curate without CLI. |
| #2 | `feat(waterfall): real engine math` | Simulator shows real numbers, not placeholders. |

---

## Open questions before #2

- Confirm `waterfall_state` schema shape (workshop).
- Decide whether contingent paths live in document state or are computed at engine time from death order + spouse status.
- Decide whether unallocated assets default to spouse, intestacy, or "flagged for follow-up." PRD implied spouse/intestacy; confirm.
