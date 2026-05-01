# ADR-10: Vercel AI SDK adoption — defer to V2

- **Status:** Accepted
- **Date:** 2026-04-30
- **Supersedes / amends:** ADR-5 ("LLM-Agnostic AI Layer via Vercel AI SDK")
- **Owner:** Allan Crawford
- **Related:** Beta-parity plan Issue 1.4 (`docs/plans/beta-parity-2026-04.md`)

## Context

ADR-5 prescribed building Provost's AI layer on the Vercel AI SDK to keep us provider-agnostic. The team instead built directly on the `openai` npm SDK from inside Convex actions. ADR-5 is therefore stale and we owe a deliberate yes/no rather than letting the gap drift.

Beta launches April 15, 2026. Today's inventory of `convex/` (excluding `_generated/`):

| File | Kind | Model | Notes |
|---|---|---|---|
| `convex/guardrails.ts` | chat (non-stream) | gpt-4.1-mini | classifier |
| `convex/agent/promptSuggestions.ts` | chat (non-stream) | gpt-4.1 | one-shot |
| `convex/agent/summarize.ts` | chat (non-stream) | gpt-4.1-mini | thread summary |
| `convex/agent/embed.ts` | embeddings | text-embedding-3-small | 1536-dim, schema-pinned |
| `convex/agent/tools/summarizeLesson.ts` | chat (non-stream) | gpt-4.1 | tool body |
| `convex/agent/tools/draftRevision.ts` | streaming chat | gpt-4.1 | streams content deltas |
| `convex/agent/tools/explainDocument.ts` | streaming chat | gpt-4.1 | streams content deltas |
| `convex/agent/runActions.ts` | streaming chat + **tool-calling loop** | gpt-4.1 | the core agent loop |
| `convex/agent/openai.ts` | client factory | — | shared `OpenAI` instance |

**Totals:** 9 call sites — 4 non-streaming chat, 1 embeddings, 2 streaming-only chat, 1 streaming chat with tool-calling loop, 1 client factory. Zero existing `@ai-sdk/*` imports.

### Migration lift estimate

- **Easy** (drop-in `generateText` / `embed`): 5 sites — guardrails, promptSuggestions, summarize, summarizeLesson, embed. ~0.5 day total.
- **Medium** (single-turn streams → `streamText` + adapt the Convex-event writer): 2 sites — draftRevision, explainDocument. ~0.5 day.
- **Hard** (`runActions.ts`): the streaming + tool-call accumulator is ~150 LOC of bespoke logic that emits `content_started`/`content_delta`/`tool_call_started`/`tool_call_delta`/`tool_call_finished` events into a Convex table. AI SDK's `streamText` model is part-based (`text-delta`, `tool-call`, `tool-result`); the event-shape mapping is tractable but every code path must be re-tested. ~1.5–2 days plus QA.

**Total: ~2.5–3 engineer-days, concentrated on the one file that matters most for beta UX.**

### Decision factors

- **Strategic value of going now:** real but speculative. We have no concrete plan to swap providers in the next quarter, and OpenAI's tool-call schema is the de-facto standard most other providers ape.
- **What we'd actually gain:** unified `tool()` definitions, telemetry hooks, easier future Anthropic/Gemini fallback. Nice-to-have, not load-bearing.
- **Runtime compatibility:** Convex actions are Node, support arbitrary npm; AI SDK runs there. Not a blocker.
- **Risk of going now:** the agent loop is the single highest-risk code path in the product (chat works because that file works). Refactoring it 2 weeks before beta to chase a benefit we don't yet need is exactly the kind of pre-launch yak-shave that breaks launches.
- **Cost of waiting:** small. Each new call site we add between now and the trigger is +0.25 day of future migration. Acceptable.
- **Note on streaming "plumbing":** the iterator does **not** speak SSE — it writes event rows into a Convex table that clients subscribe to reactively. AI SDK doesn't replace that layer; it would only replace the OpenAI iterator feeding it. So the "AI SDK gives us streaming for free" argument doesn't really apply here.

## Decision

**Defer Vercel AI SDK adoption to V2.** Continue using the `openai` SDK directly through beta and into the immediate post-beta period.

### Trigger conditions (any one flips this to "do it now")

1. **Provider swap on the table.** Concrete decision to add Anthropic, Gemini, or a self-hosted model as primary or fallback for any production call site.
2. **Vercel AI Gateway becomes the routing layer for Provost** (cost controls, per-tenant key routing, or unified observability we'd otherwise have to build).
3. **Tool-call surface area doubles.** If `packages/agent` grows past ~30 tools or we add multi-agent handoff, the SDK's tool ergonomics start paying for themselves.
4. **Observability gap.** If we adopt Langfuse / Helicone / OpenTelemetry-for-LLMs and AI SDK's instrumentation hooks are materially better than what we wire by hand.

When a trigger fires, migrate as a single focused initiative — do not mix it with feature work.

## Consequences

### Positive

- Beta ships on the code path we've actually been testing.
- ADR-5 is no longer ambiguous: the answer is "not yet, and here's what would change our mind."
- New AI call sites added between now and the trigger have a clear instruction: use the existing `openai.ts` client; don't introduce `@ai-sdk/*` piecemeal.

### Negative

- We carry technical debt against ADR-5's original intent. Provider-agnosticism remains a future project, not a current property.
- If a trigger fires unexpectedly (e.g., OpenAI outage forces an Anthropic fallback), we'll do the migration under time pressure rather than calmly.

### Risks & mitigation

- **Risk:** drift — partial AI SDK adoption sneaks in via a feature branch. **Mitigation:** lint/CI rule or PR-review checklist item: "no `@ai-sdk/*` imports without an ADR amendment."
- **Risk:** the tool-call accumulator in `runActions.ts` becomes harder to migrate as it grows. **Mitigation:** keep that file's surface area stable; new tool behaviors go in `packages/agent`, not the loop.

## Alternatives considered

1. **Adopt now, full migration in Phase 4.** Rejected: 2.5–3 days of refactor on the highest-risk file 2 weeks before beta, with no concrete provider-swap need.
2. **Partial adoption — migrate the easy 5 sites now, defer `runActions.ts`.** Rejected explicitly: leaves us with two SDKs in one codebase, doubles the mental model, and captures none of the strategic value (the loop is where provider-agnosticism would matter most).
3. **Rewrite ADR-5 to bless direct OpenAI usage permanently.** Rejected: forecloses optionality we may genuinely want in 6–12 months.
