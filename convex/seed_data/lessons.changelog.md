# `lessons.json` changelog

## 2026-04 — Brad curriculum edits (Issue 3.5, beta-parity-2026-04)

Source of truth: `convex/migrations/curriculumEdits202604.ts`.

Brad's 11 effective curriculum edits (from `education-brad-feedback.md`)
target the production curriculum tree (Programs → Tracks → Lessons), not the
demo seed lessons that currently live in `lessons.json`. Concretely:

- The seed JSON contains 12 demo lessons used by `seed.ts` to populate a
  family's lesson catalog with rich slide/article content (Three Buckets,
  Trusts, Investing Basics, etc.).
- Brad's 2026-04 edits target lessons with titles like "Income Sources",
  "Building Blocks of Investing", "Powers of Attorney", etc. — none of which
  appear verbatim in this seed file.

Therefore this changelog is the only edit applied to the seed for the
2026-04 curriculum revision: the migration is the authoritative apply-path
for both existing deployments and any future seed of the production
curriculum tree.

When Brad signs off and the migration runs, fresh deployments will continue
to produce demo lessons from this JSON; the production curriculum (seeded
elsewhere, e.g. via `williamsBackfill` or a future production-seed file)
will reflect the post-migration state.

### Open follow-ups

- **Entity-Level Tax Strategy** (edit `6-flag-entity-level-tax-strategy`):
  Brad to provide new title/scope. Currently flagged, not changed.
- **Priority field**: edits 8 and 9 change Core/Extended/Exploratory
  priority, but the `lessons` schema does not yet carry a `priority` field.
  Migration records intent via audit events; schema work tracked separately.
