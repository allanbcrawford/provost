// Pure unit tests for the waterfall engine. Exercises the
// trust-supersedes-will rule, deathOrder branch selection, single-will
// (residuary unallocated) scenario, and the addResiduaryToSpouse routing.

import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import type { WaterfallState } from "../convex/lib/waterfallState";
import { compute, type EngineAsset, type EngineDocument } from "../convex/waterfallEngine";

// --- Test helpers --------------------------------------------------------

const FAMILY_ID = "fam_test" as Id<"families">;

function asset(id: string, type: string, value: number): EngineAsset {
  return {
    _id: id as Id<"assets">,
    name: `${type} ${id}`,
    type,
    value,
    currency: "USD",
  };
}

function doc(id: string, name: string, state: WaterfallState): EngineDocument {
  return {
    _id: id as Id<"documents">,
    name,
    state,
  };
}

// Branch shapes reused across tests.
const willStateRobertFirst: WaterfallState = {
  priority_class: 2,
  branches: [
    {
      when: "robert-first",
      distributions: [
        // 25% to charity from brokerage only; remaining 75% intentionally
        // unallocated so the test can verify the unallocated bucket.
        {
          beneficiaryId: "ucla-law",
          share: 0.25,
          assetFilter: { types: ["Brokerage"] },
        },
      ],
    },
  ],
};

const trustState: WaterfallState = {
  priority_class: 0,
  branches: [
    {
      when: "robert-first",
      distributions: [{ beneficiaryId: "linda", share: 1.0 }],
    },
    {
      when: "linda-first",
      distributions: [{ beneficiaryId: "robert", share: 1.0 }],
    },
    {
      when: "simultaneous",
      distributions: [
        { beneficiaryId: "david", share: 0.5 },
        { beneficiaryId: "jennifer", share: 0.5 },
      ],
    },
  ],
};

// --- Tests --------------------------------------------------------------

describe("waterfallEngine.compute", () => {
  it("single-will scenario leaves residuary unallocated", () => {
    const will = doc("will_1", "Last Will of Robert", willStateRobertFirst);
    const assets = [asset("a1", "Brokerage", 1_000_000)];

    const out = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id],
      deathOrder: "robert-first",
      customEdits: {},
      revisions: {},
      assets,
      documents: [will],
    });

    // 25% to UCLA = 250k, 75% unallocated = 750k.
    expect(out.perBeneficiaryTotals.ucla_law ?? out.perBeneficiaryTotals["ucla-law"]).toBeCloseTo(
      250_000,
      0,
    );
    expect(out.unallocated).toBeCloseTo(750_000, 0);
    // Asset is consumed by the will (it had a matching distribution), so it
    // doesn't appear in unallocatedAssetIds — within-doc remainder is just
    // a dollar number, not a per-asset tag.
    expect(out.unallocatedAssetIds).toHaveLength(0);
    expect(out.flows).toHaveLength(1);
    expect(out.flows[0]?.toBeneficiaryId).toBe("ucla-law");
  });

  it("trust supersedes will when priority_class is lower", () => {
    // Trust claims everything for Linda on robert-first; will would also
    // touch the same asset but loses the priority race.
    const trust = doc("t1", "Revocable Trust", trustState);
    const will = doc("w1", "Will", willStateRobertFirst);
    const assets = [asset("a1", "Brokerage", 1_000_000)];

    const out = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id, trust._id], // selection order shouldn't matter
      deathOrder: "robert-first",
      customEdits: {},
      revisions: {},
      assets,
      documents: [will, trust],
    });

    expect(out.perBeneficiaryTotals.linda).toBeCloseTo(1_000_000, 0);
    expect(out.perBeneficiaryTotals["ucla-law"]).toBeUndefined();
    expect(out.unallocated).toBe(0);
    expect(out.flows).toHaveLength(1);
    expect(out.flows[0]?.sourceDocumentId).toBe(trust._id);
  });

  it("selects the branch matching the requested deathOrder", () => {
    const trust = doc("t1", "Revocable Trust", trustState);
    const assets = [asset("a1", "Brokerage", 500_000)];

    const linda = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [trust._id],
      deathOrder: "linda-first",
      customEdits: {},
      revisions: {},
      assets,
      documents: [trust],
    });
    expect(linda.perBeneficiaryTotals.robert).toBeCloseTo(500_000, 0);
    expect(linda.perBeneficiaryTotals.linda).toBeUndefined();

    const sim = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [trust._id],
      deathOrder: "simultaneous",
      customEdits: {},
      revisions: {},
      assets,
      documents: [trust],
    });
    expect(sim.perBeneficiaryTotals.david).toBeCloseTo(250_000, 0);
    expect(sim.perBeneficiaryTotals.jennifer).toBeCloseTo(250_000, 0);
  });

  it("addResiduaryToSpouse routes unallocated to the surviving spouse", () => {
    // Will only allocates 25% — without the revision, 75% is unallocated.
    // With the revision flag set under robert-first, that 75% lands on
    // Linda as a synthetic edge.
    const will = doc("w1", "Will", willStateRobertFirst);
    const assets = [asset("a1", "Brokerage", 1_000_000)];

    const baseline = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id],
      deathOrder: "robert-first",
      customEdits: {},
      revisions: {},
      assets,
      documents: [will],
    });
    expect(baseline.unallocated).toBeCloseTo(750_000, 0);
    expect(baseline.perBeneficiaryTotals.linda).toBeUndefined();

    const withResiduary = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id],
      deathOrder: "robert-first",
      customEdits: {},
      revisions: { addResiduaryToSpouse: true },
      assets,
      documents: [will],
    });
    expect(withResiduary.unallocated).toBe(0);
    expect(withResiduary.perBeneficiaryTotals.linda).toBeCloseTo(750_000, 0);
    // Synthetic spouse-residuary edge has no source document.
    const syntheticEdge = withResiduary.flows.find(
      (e) => e.sourceDocumentId === null && e.toBeneficiaryId === "linda",
    );
    expect(syntheticEdge).toBeDefined();
    expect(syntheticEdge?.amount).toBeCloseTo(750_000, 0);
  });

  it("addResiduaryToSpouse routes to robert when linda dies first", () => {
    const will = doc("w1", "Will", {
      priority_class: 2,
      branches: [
        {
          when: "linda-first",
          distributions: [
            {
              beneficiaryId: "ucla-law",
              share: 0.1,
              assetFilter: { types: ["Brokerage"] },
            },
          ],
        },
      ],
    });
    const assets = [asset("a1", "Brokerage", 100_000)];

    const out = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id],
      deathOrder: "linda-first",
      customEdits: {},
      revisions: { addResiduaryToSpouse: true },
      assets,
      documents: [will],
    });
    expect(out.unallocated).toBe(0);
    expect(out.perBeneficiaryTotals.robert).toBeCloseTo(90_000, 0);
  });

  it("flags unallocated assets when no document branch matches", () => {
    // Will's only branch is robert-first, but we ask for linda-first → no
    // applicable branch, asset is fully unallocated.
    const will = doc("w1", "Will", willStateRobertFirst);
    const assets = [asset("a1", "Brokerage", 100_000)];

    const out = compute({
      familyId: FAMILY_ID,
      selectedDocumentIds: [will._id],
      deathOrder: "linda-first",
      customEdits: {},
      revisions: {},
      assets,
      documents: [will],
    });

    expect(out.unallocated).toBeCloseTo(100_000, 0);
    expect(out.unallocatedAssetIds).toEqual([assets[0]?._id]);
    const diag = out.documentDiagnostics.find((d) => d.issue === "no_applicable_branch");
    expect(diag).toBeDefined();
  });
});
