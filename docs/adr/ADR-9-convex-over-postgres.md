# ADR-9: Convex over PostgreSQL + Drizzle

**Status:** Accepted
**Date:** 2026-04-30
**Author:** Allan Crawford / Engineering Lead
**Supersedes:** ADR-8 (PostgreSQL + pgvector via Drizzle ORM)

---

## Context

ADR-8, written in April 2026 as part of the V1 Architecture Decision Record, specified PostgreSQL with the pgvector extension accessed through Drizzle ORM as the persistence layer for Provost. That decision was sound given the stated requirements: a relational data model for families and their estate structures, vector similarity search for Knowledge Base retrieval, type-safe migrations, and per-family database isolation (ADR-3) with per-family Cloud KMS keys on GCP Cloud SQL.

The broader architecture prescribed in that document — GCP Cloud Run for compute, Firebase Auth for identity, Drizzle for schema management, pgvector for embeddings, and Cloud Tasks for background work — represented a coherent, well-reasoned stack. ADR-8 was not wrong. The team chose not to build it.

What was actually built, and what is currently running in production on Vercel, is a different stack: Next.js 14 App Router with a Convex backend. The reasons for this divergence are practical rather than architectural: the team reached for Convex early in development and found that it collapsed several moving parts into a single service. By the time ADR-8 was formally written, the running implementation had already diverged from it.

This ADR documents that divergence and records the rationale for keeping Convex rather than migrating to the prescribed stack.

---

## Decision

The team will continue using Convex as the primary backend, schema layer, and vector index. We will not migrate to PostgreSQL + Drizzle + pgvector. ADR-8 is superseded by this decision. ADR-3 (per-family isolated databases) is also superseded; see the note in that ADR.

---

## Why Convex Replaces What ADR-8 Prescribed

**Schema and mutations.** Convex provides a TypeScript-native schema definition and strongly typed query/mutation functions. This achieves the same type-safety goal as Drizzle without a separate migration runner. Schema changes are reflected immediately in generated types via `convex dev`.

**Vector search.** Convex has a built-in vector index (`vectorSearch`) that stores and queries 1536-dimension embeddings within the same document store. The 345 Succession Advisors artifacts are already ingested into the `library_sources` table with embeddings in place. There is no separate pgvector instance to manage.

**Background and scheduled work.** Convex actions run arbitrary async logic, and `convex/crons.ts` handles scheduled jobs. This replaces Cloud Tasks + Cloud Run Jobs without a separate job queue service.

**Reactive queries.** Convex queries are live-updated on the client via a subscription model. The Provost chat panel and bento home dashboard depend on this; replicating it with Next.js API routes + polling would require additional infrastructure.

**Multi-tenancy.** ADR-3 prescribed a database-per-family architecture with per-family KMS keys. Convex does not support provisioning isolated database instances per tenant. The running implementation uses row-level scoping: every table that carries family data has a `family_id` field, and every Convex query and mutation goes through a `requireFamilyMember` authorization helper that enforces family isolation at the application layer. This is a meaningfully different compliance story from ADR-3 — we do not have database-level isolation or per-family encryption keys. The security boundary is application-enforced row scoping plus Convex's platform-level encryption at rest. This trade-off is documented and accepted for V1 beta; a future V2 decision should revisit whether UHNW clients require stronger isolation guarantees.

**Authentication.** ADR-4 (Firebase Auth) is similarly superseded. The running implementation uses Clerk for authentication and JWT-based session validation. Clerk custom claims carry role information (`provost_admin`, `advisor`, `family_admin`, `family_member`) through to Convex mutations via the `auth` context. The role mapping table from ADR-4 still applies; only the mechanism changes.

---

## Consequences

**Positive:**
- No migration work required. The Convex implementation is already running.
- Operational surface is smaller: one service (Convex cloud deployment `decisive-minnow-878`) handles persistence, background jobs, vector search, and real-time subscriptions.
- TypeScript types flow end-to-end from Convex schema to Next.js components via generated `convex/_generated/` types.

**Negative / Accepted risks:**
- Per-family database isolation (ADR-3) is not achievable on Convex. Application-layer `family_id` scoping is the isolation mechanism. A cross-family data leak would be a bug in authorization logic, not a structural impossibility.
- Per-family KMS encryption keys (ADR-3) are not available. Convex encrypts all data at rest uniformly.
- Vendor dependency: the Convex platform is a managed cloud service. Migrating off Convex in the future would be a significant engineering effort.
- The Vercel AI SDK (ADR-5) has not yet been adopted. OpenAI is called directly from Convex actions. A follow-on ADR-10 will decide whether to adopt the Vercel AI SDK now or defer to V2.

**Documentation impact:**
- ADR-3: superseded — see note in `2026-04-07-provost-v1-architecture.md`
- ADR-4: superseded — see note in `2026-04-07-provost-v1-architecture.md`
- ADR-8: superseded by this document
- `backend-map.md`, `frontend-map.md`: archived (describe the FastAPI/provost-fe split that was never the running system)
