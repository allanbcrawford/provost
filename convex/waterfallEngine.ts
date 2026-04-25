// Pure waterfall inheritance engine.
//
// Walks each asset through the user-selected estate documents in priority
// order (revocable trust > irrevocable > will) and applies the structured
// WaterfallState distribution that lives on each document. First doc whose
// active branch claims the asset wins — the asset is consumed and removed
// from the pool. Anything left over is reported as `unallocated`; if the
// caller passed `revisions.addResiduaryToSpouse`, that pool is rerouted to
// the surviving spouse beneficiary.
//
// This file is deliberately pure (no Convex ctx, no DB, no fetch) so it can
// be unit-tested with vitest under edge-runtime AND so the Convex query in
// `convex/waterfalls.ts` can preload data once and call this synchronously.

import type { Id } from "./_generated/dataModel";
import {
  type DeathOrder,
  safeParseWaterfallState,
  selectBranch,
  type WaterfallState,
} from "./lib/waterfallState";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EngineRevisions = {
  // The other revision toggles the simulation modal exposes don't yet alter
  // engine math — they're cosmetic overlays on the diagram. Only the
  // residuary-to-spouse toggle changes flows.
  addResiduaryToSpouse?: boolean;
  // Pass-through bag so the caller can extend without breaking the type.
  [key: string]: boolean | undefined;
};

export type EngineAsset = {
  _id: Id<"assets">;
  name: string;
  type: string;
  value: number;
  currency: string;
};

export type EngineDocument = {
  _id: Id<"documents">;
  name: string;
  // Document state blob from the documents table. We re-validate here with
  // safeParseWaterfallState so a malformed blob is skipped (with a flag in
  // the result) rather than crashing the whole compute.
  state: unknown;
};

export type Edge = {
  fromBeneficiaryId: string | null; // null = source pool / estate
  toBeneficiaryId: string;
  amount: number;
  assetIds: Id<"assets">[];
  sourceDocumentId: Id<"documents"> | null; // null when it's a synthetic spouse-residuary edge
};

export type ComputeInput = {
  familyId: Id<"families">;
  selectedDocumentIds: Id<"documents">[];
  deathOrder: DeathOrder;
  customEdits: { spouseBeneficiaryId?: string } & Record<string, unknown>;
  revisions: EngineRevisions;
  assets: EngineAsset[];
  documents: EngineDocument[];
};

export type ComputeResult = {
  flows: Edge[];
  unallocated: number;
  unallocatedAssetIds: Id<"assets">[];
  perBeneficiaryTotals: Record<string, number>;
  // Diagnostics — surfaces docs that failed validation or had no applicable
  // branch for the selected death order. The UI ignores these for v1 but
  // the LLM extraction tooling will rely on them.
  documentDiagnostics: Array<{
    documentId: Id<"documents">;
    issue: "invalid_state" | "no_applicable_branch" | "no_state";
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_FALLBACK = 99;

function priorityOf(state: WaterfallState | null): number {
  if (!state) return PRIORITY_FALLBACK;
  return state.priority_class;
}

function assetMatchesFilter(
  asset: EngineAsset,
  filter: { types?: string[]; assetIds?: string[] } | undefined,
): boolean {
  if (!filter) return true;
  if (filter.assetIds && filter.assetIds.length > 0) {
    if (!filter.assetIds.includes(asset._id)) return false;
  }
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(asset.type)) return false;
  }
  return true;
}

// Williams demo uses fixed beneficiary keys. The "spouse" surviving the
// passing of the chosen first-decedent depends on deathOrder. Robert dies
// first → Linda survives, etc. simultaneous = no spouse.
function inferSpouseBeneficiary(
  deathOrder: DeathOrder,
  customEdits: { spouseBeneficiaryId?: string } & Record<string, unknown>,
): string | null {
  if (customEdits.spouseBeneficiaryId) return customEdits.spouseBeneficiaryId;
  if (deathOrder === "robert-first") return "linda";
  if (deathOrder === "linda-first") return "robert";
  return null;
}

// ---------------------------------------------------------------------------
// compute()
// ---------------------------------------------------------------------------

export function compute(input: ComputeInput): ComputeResult {
  const { selectedDocumentIds, deathOrder, revisions, assets, documents } = input;

  // 1. Resolve doc rows in selection order, validate state blobs, sort by
  //    priority_class ascending. We carry parsed state alongside the row so
  //    the per-asset loop doesn't re-parse N times.
  const selectedSet = new Set(selectedDocumentIds.map((id) => String(id)));
  const docDiagnostics: ComputeResult["documentDiagnostics"] = [];

  type Prepared = {
    doc: EngineDocument;
    state: WaterfallState;
  };

  const prepared: Prepared[] = [];
  for (const doc of documents) {
    if (!selectedSet.has(String(doc._id))) continue;
    if (doc.state == null) {
      docDiagnostics.push({ documentId: doc._id, issue: "no_state" });
      continue;
    }
    const parsed = safeParseWaterfallState(doc.state);
    if (!parsed.ok) {
      docDiagnostics.push({ documentId: doc._id, issue: "invalid_state" });
      continue;
    }
    prepared.push({ doc, state: parsed.value });
  }

  prepared.sort((a, b) => priorityOf(a.state) - priorityOf(b.state));

  // 2. For each asset, walk prepared docs in priority order. The first doc
  //    whose active branch contains a distribution that matches the asset
  //    consumes it. We accumulate distributions per-asset rather than
  //    fractional bookkeeping across multiple docs — once an asset is
  //    consumed by a higher-priority doc, lower-priority docs can't see it.
  const _flows: Edge[] = [];
  const perBeneficiaryTotals: Record<string, number> = {};
  const unallocatedAssetIds: Id<"assets">[] = [];
  let unallocated = 0;

  // Track which docs had no applicable branch for the selected deathOrder so
  // we can flag them once instead of once per asset.
  const flaggedNoBranch = new Set<string>();

  // Aggregate by (sourceDoc, beneficiary) so a doc that gives David 33% of
  // ten different brokerage rows shows up as a single Edge with assetIds[].
  type EdgeKey = string;
  const edgeAccumulator = new Map<
    EdgeKey,
    {
      fromBeneficiaryId: string | null;
      toBeneficiaryId: string;
      amount: number;
      assetIds: Id<"assets">[];
      sourceDocumentId: Id<"documents"> | null;
    }
  >();
  function addToEdge(
    sourceDocumentId: Id<"documents"> | null,
    fromBeneficiaryId: string | null,
    toBeneficiaryId: string,
    amount: number,
    assetId: Id<"assets">,
  ) {
    const key = `${sourceDocumentId ?? "_"}::${fromBeneficiaryId ?? "_"}::${toBeneficiaryId}`;
    const existing = edgeAccumulator.get(key);
    if (existing) {
      existing.amount += amount;
      existing.assetIds.push(assetId);
    } else {
      edgeAccumulator.set(key, {
        sourceDocumentId,
        fromBeneficiaryId,
        toBeneficiaryId,
        amount,
        assetIds: [assetId],
      });
    }
    perBeneficiaryTotals[toBeneficiaryId] = (perBeneficiaryTotals[toBeneficiaryId] ?? 0) + amount;
  }

  for (const asset of assets) {
    let consumed = false;
    for (const { doc, state } of prepared) {
      const branch = selectBranch(state, deathOrder);
      if (!branch) {
        flaggedNoBranch.add(String(doc._id));
        continue;
      }
      // A branch with zero distributions (e.g. will under linda-first when
      // testator hasn't died) intentionally does nothing. Skip past it so
      // the next doc in priority order gets a shot.
      if (branch.distributions.length === 0) continue;

      // Find distributions whose filter accepts this asset. If any matches,
      // this doc claims the asset. Distributions WITHIN this doc's branch
      // sum to the share allocations applied to the asset; their share
      // values must sum to <= 1 (engine doesn't enforce strict equality —
      // unallocated remainder within a doc is re-pooled into "unallocated"
      // for now, which matches the locked spec's flag-don't-default rule).
      const matches = branch.distributions.filter((d) => assetMatchesFilter(asset, d.assetFilter));
      if (matches.length === 0) continue;

      let totalShareApplied = 0;
      for (const d of matches) {
        const amount = asset.value * d.share;
        if (amount === 0) continue;
        addToEdge(doc._id, null, d.beneficiaryId, amount, asset._id);
        totalShareApplied += d.share;
      }

      // Within-doc remainder (e.g. a will that allocates 0.99 to revocable
      // trust + 0.01 to UCLA → totalShareApplied = 1.0; or a malformed doc
      // that only gives out 0.5). Anything left becomes unallocated for
      // this asset slice.
      const remainderShare = Math.max(0, 1 - totalShareApplied);
      if (remainderShare > 1e-9) {
        unallocated += asset.value * remainderShare;
      }
      consumed = true;
      break;
    }

    if (!consumed) {
      unallocated += asset.value;
      unallocatedAssetIds.push(asset._id);
    }
  }

  for (const id of flaggedNoBranch) {
    docDiagnostics.push({
      documentId: id as Id<"documents">,
      issue: "no_applicable_branch",
    });
  }

  // 3. Apply the optional residuary-to-spouse revision. The unallocated
  //    pool becomes a synthetic edge (no source document) toward the
  //    surviving spouse beneficiary. We bypass the per-asset addToEdge
  //    helper because this is a single aggregate edge, not a per-asset
  //    distribution.
  if (revisions.addResiduaryToSpouse && unallocated > 0) {
    const spouseId = inferSpouseBeneficiary(deathOrder, input.customEdits);
    if (spouseId) {
      const drainedAssetIds = unallocatedAssetIds.slice();
      const synthKey = `_::_::${spouseId}`;
      const existing = edgeAccumulator.get(synthKey);
      if (existing) {
        existing.amount += unallocated;
        existing.assetIds.push(...drainedAssetIds);
      } else {
        edgeAccumulator.set(synthKey, {
          sourceDocumentId: null,
          fromBeneficiaryId: null,
          toBeneficiaryId: spouseId,
          amount: unallocated,
          assetIds: drainedAssetIds,
        });
      }
      perBeneficiaryTotals[spouseId] = (perBeneficiaryTotals[spouseId] ?? 0) + unallocated;
      unallocated = 0;
      unallocatedAssetIds.length = 0;
    }
  }

  return {
    flows: Array.from(edgeAccumulator.values()).map((e) => ({
      fromBeneficiaryId: e.fromBeneficiaryId,
      toBeneficiaryId: e.toBeneficiaryId,
      amount: e.amount,
      assetIds: e.assetIds,
      sourceDocumentId: e.sourceDocumentId,
    })),
    unallocated,
    unallocatedAssetIds,
    perBeneficiaryTotals,
    documentDiagnostics: docDiagnostics,
  };
}
