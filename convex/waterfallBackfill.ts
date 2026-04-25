// Williams demo waterfall-state backfill.
//
// Hand-authored WaterfallState payloads that get written into the `state`
// field of the existing Williams demo documents (revocable trust, irrevocable
// life insurance trust, will). These payloads exist so the inheritance engine
// (task #41) has realistic fixtures to compute against — they're NOT the
// engine's source of truth in production; production state will be authored
// via a UI editor + AI extraction pipeline.
//
// Beneficiary ids are stable string keys (`linda`, `david`, `jennifer`,
// `michael`, `ucla-law`, `sm-childrens-health`). The engine resolves them to
// concrete user / professional / org rows via a separate lookup table — this
// keeps the demo data portable across deployments where the underlying user
// _id values differ.
//
// Run via the Convex CLI when the Williams demo data is loaded:
//   npx convex run waterfallBackfill:seedWilliamsWaterfallStates

import { internalMutation } from "./_generated/server";
import { parseWaterfallState, type WaterfallState } from "./lib/waterfallState";

// ---------------------------------------------------------------------------
// Hand-authored payloads
// ---------------------------------------------------------------------------

// Revocable Living Trust of Robert Williams — priority 0.
// Standard A/B/C split on first death (engine resolves the marital-deduction
// math from the share fractions); on second death the residuary flows to the
// three children equally. Mirrors the eyeballed allocation in
// apps/web/src/features/waterfall/waterfall-diagram.tsx (DEFAULT_CHILDREN_PCT
// = david 33, jennifer 34, michael 33).
const REVOCABLE_TRUST_STATE: WaterfallState = {
  priority_class: 0,
  branches: [
    {
      when: "robert-first",
      // Robert dies first → spouse's half stays in survivor's trust for
      // Linda; Robert's half funds the family + marital trusts. Encoded as
      // 100% to Linda for simplicity at the trust level — the A/B/C split
      // is a *funding* concern the engine handles when it walks specific
      // assets through the trust structure.
      distributions: [{ beneficiaryId: "linda", share: 1.0 }],
    },
    {
      when: "linda-first",
      // Linda dies first → her share stays available to Robert via the
      // survivor's trust.
      distributions: [{ beneficiaryId: "robert", share: 1.0 }],
    },
    {
      when: "simultaneous",
      // No surviving spouse → straight to children per the trust's residuary
      // distribution scheme.
      distributions: [
        { beneficiaryId: "david", share: 0.33 },
        { beneficiaryId: "jennifer", share: 0.34 },
        { beneficiaryId: "michael", share: 0.33 },
      ],
    },
  ],
  residuary: { beneficiaryId: "linda" },
};

// Williams Irrevocable Life Insurance Trust — priority 1. Holds a $5M policy
// on Robert's life. Pays out when Robert dies regardless of order, splits to
// the three children. (The trust agreement itself names the children directly
// so death order of the spouse is irrelevant.)
const ILIT_STATE: WaterfallState = {
  priority_class: 1,
  branches: [
    {
      when: "always",
      distributions: [
        { beneficiaryId: "david", share: 0.33 },
        { beneficiaryId: "jennifer", share: 0.34 },
        { beneficiaryId: "michael", share: 0.33 },
      ],
    },
  ],
};

// Last Will and Testament of Robert James Williams — priority 2 (pour-over
// will; only catches whatever didn't make it into the revocable trust).
// Specific bequest: $250k to UCLA School of Law for the scholarship named
// in the will. Residuary pours into the revocable trust, which the engine
// follows by reading the trust's own state.
//
// On linda-first, residuary still pours over to the trust — the trust then
// handles the survivor branch. We encode that as a single distribution to
// `revocable-trust` (a synthetic beneficiary the engine recognizes as a
// trust-of-trusts redirect) plus the UCLA bequest.
const WILL_STATE: WaterfallState = {
  priority_class: 2,
  branches: [
    {
      when: "robert-first",
      distributions: [
        // $250k specific bequest. Modeled as a tiny share with a UCLA-tagged
        // assetFilter so the engine pulls from cash/brokerage. Real-world
        // this would be a fixed-dollar bequest; the demo uses 0.01 as a
        // proxy until the engine grows fixed-dollar support.
        {
          beneficiaryId: "ucla-law",
          share: 0.01,
          assetFilter: { types: ["Brokerage", "Checking"] },
        },
        // Residuary pours into the revocable trust.
        { beneficiaryId: "revocable-trust", share: 0.99 },
      ],
    },
    {
      when: "linda-first",
      // Will only triggers on the testator's (Robert's) death — if Linda
      // dies first, Robert's will is dormant. Encode an empty distribution
      // so the engine sees the branch exists but has nothing to do.
      distributions: [],
    },
    {
      when: "simultaneous",
      distributions: [
        {
          beneficiaryId: "ucla-law",
          share: 0.01,
          assetFilter: { types: ["Brokerage", "Checking"] },
        },
        { beneficiaryId: "revocable-trust", share: 0.99 },
      ],
    },
  ],
  residuary: { beneficiaryId: "revocable-trust" },
};

// ---------------------------------------------------------------------------
// Match table — document name/type → state payload
// ---------------------------------------------------------------------------
//
// Match by exact `type` first, fall back to a substring match on `name` so we
// catch the Williams docs even if their `type` field drifts. Each entry runs
// at most once per family.
type Matcher = {
  // Human label, shown in the mutation's return value.
  label: string;
  // Predicate against the document row.
  matches: (doc: { name: string; type: string }) => boolean;
  state: WaterfallState;
};

const MATCHERS: Matcher[] = [
  {
    label: "Revocable Living Trust",
    matches: (d) => d.type === "Revocable Living Trust" || /Revocable Living Trust/i.test(d.name),
    state: REVOCABLE_TRUST_STATE,
  },
  {
    label: "Irrevocable Life Insurance Trust",
    matches: (d) =>
      d.type === "Irrevocable Life Insurance Trust" ||
      /Irrevocable Life Insurance Trust/i.test(d.name),
    state: ILIT_STATE,
  },
  {
    label: "Last Will and Testament",
    matches: (d) => d.type === "Last Will and Testament" || /Last Will and Testament/i.test(d.name),
    state: WILL_STATE,
  },
];

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

export const seedWilliamsWaterfallStates = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Validate every payload up-front so a typo in a hand-authored fixture
    // surfaces as a zod error before we touch the database.
    for (const m of MATCHERS) {
      parseWaterfallState(m.state);
    }

    const documents = await ctx.db.query("documents").collect();

    const updated: Array<{
      documentId: string;
      label: string;
      name: string;
      previouslyHadState: boolean;
    }> = [];
    const skipped: Array<{ label: string; reason: string }> = [];

    for (const matcher of MATCHERS) {
      const matches = documents.filter(
        (d) => !d.deleted_at && matcher.matches({ name: d.name, type: d.type }),
      );

      if (matches.length === 0) {
        skipped.push({ label: matcher.label, reason: "no matching document" });
        continue;
      }

      for (const doc of matches) {
        await ctx.db.patch(doc._id, { state: matcher.state });
        updated.push({
          documentId: doc._id,
          label: matcher.label,
          name: doc.name,
          previouslyHadState: doc.state !== undefined,
        });
      }
    }

    return {
      updatedCount: updated.length,
      updated,
      skipped,
    };
  },
});
