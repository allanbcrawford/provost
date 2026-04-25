// Waterfall inheritance state — locked document-state shape for will/trust
// documents. The actual waterfall *engine* (task #41) consumes this shape and
// computes per-beneficiary distributions given a deathOrder input. This file
// owns ONLY the shape, the runtime validator, and a tiny pure helper for
// branch selection. No engine math lives here.
//
// Locked design decisions (see task #36):
//   1. Contingent paths are stored as branches keyed by `when`. The engine
//      selects a branch at runtime based on the caller's deathOrder. The doc
//      encodes "if Robert dies first, distributions look like X."
//   2. Unallocated remainder is FLAGGED (no auto-allocation). Spouse-fallback
//      is an opt-in revision toggle, not a default of this state shape.
//
// Priority class encodes precedence when multiple instruments distribute the
// same asset (lower number wins): revocable trust beats irrevocable beats
// will. This matches the standard estate-plan precedence and is what the
// engine uses to resolve cross-document conflicts.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Branch trigger. `always` means the branch applies regardless of which
 * spouse dies first (used for single-grantor instruments and for the will's
 * residuary clause). The three named orders match the UI's DeathOrder enum
 * (apps/web/src/features/waterfall/types.ts) so the engine can pass through
 * the user's selection unchanged.
 */
export type DeathOrder = "robert-first" | "linda-first" | "simultaneous";

export type BranchWhen = DeathOrder | "always";

/**
 * A single distribution instruction. `share` is a fraction in [0, 1]; the
 * engine sums shares within a branch and flags the doc if the total leaves
 * an unallocated remainder. `assetFilter` is optional — when omitted the
 * distribution applies to the residuary pool for that branch. When set, the
 * distribution applies only to assets matching the filter (by type or by
 * explicit asset id list).
 */
export type WaterfallDistribution = {
  beneficiaryId: string;
  share: number;
  assetFilter?: {
    types?: string[];
    assetIds?: string[];
  };
};

export type WaterfallBranch = {
  when: BranchWhen;
  distributions: WaterfallDistribution[];
};

/**
 * Document-level waterfall state. Attached to documents.state when the
 * document type is a will/trust. The engine reads `priority_class` to
 * resolve cross-document conflicts, then walks `branches` to find the one
 * matching the caller's death order.
 *
 * priority_class:
 *   0 — revocable trust (highest priority; controls whatever it has been
 *       funded with)
 *   1 — irrevocable trust (controls assets re-titled into it; sits below
 *       the revocable trust in the precedence chain because the revocable
 *       trust's funding decisions can override)
 *   2 — will (lowest priority; only controls probate assets that did not
 *       pass via trust, beneficiary designation, or joint title)
 */
export type WaterfallState = {
  priority_class: 0 | 1 | 2;
  branches: WaterfallBranch[];
  residuary?: { beneficiaryId: string };
};

// ---------------------------------------------------------------------------
// Runtime validator (zod)
// ---------------------------------------------------------------------------

const distributionSchema = z.object({
  beneficiaryId: z.string().min(1),
  share: z.number().min(0).max(1),
  assetFilter: z
    .object({
      types: z.array(z.string()).optional(),
      assetIds: z.array(z.string()).optional(),
    })
    .optional(),
});

const branchSchema = z.object({
  when: z.union([
    z.literal("robert-first"),
    z.literal("linda-first"),
    z.literal("simultaneous"),
    z.literal("always"),
  ]),
  distributions: z.array(distributionSchema),
});

export const waterfallStateSchema = z.object({
  priority_class: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  branches: z.array(branchSchema).min(1),
  residuary: z
    .object({
      beneficiaryId: z.string().min(1),
    })
    .optional(),
});

/**
 * Runtime guard for write paths. Throws a zod error with field-level detail
 * on failure. Keep call sites simple: validate before patch/insert.
 */
export function parseWaterfallState(value: unknown): WaterfallState {
  return waterfallStateSchema.parse(value) as WaterfallState;
}

/**
 * Non-throwing variant for tools that want to surface a validation error in
 * a structured response. Returns either { ok: true, value } or { ok: false,
 * issues } where issues is the zod issues array.
 */
export function safeParseWaterfallState(
  value: unknown,
): { ok: true; value: WaterfallState } | { ok: false; issues: z.ZodIssue[] } {
  const result = waterfallStateSchema.safeParse(value);
  if (result.success) return { ok: true, value: result.data as WaterfallState };
  return { ok: false, issues: result.error.issues };
}

// ---------------------------------------------------------------------------
// Pure helper — branch selection
// ---------------------------------------------------------------------------

/**
 * Pick the branch the engine should evaluate for a given death order.
 *
 * Selection rules (matter-of-fact, no surprises):
 *   1. Prefer a branch whose `when` exactly matches `deathOrder`.
 *   2. Otherwise, fall back to a branch with `when === "always"`.
 *   3. Otherwise, return null. The engine MUST flag the document as not
 *      having an applicable branch for the requested scenario; it does not
 *      silently default.
 *
 * This helper is pure and side-effect-free so the engine team (task #41)
 * can use it directly and tests can exercise it without spinning up a
 * Convex sandbox.
 */
export function selectBranch(
  state: WaterfallState,
  deathOrder: DeathOrder,
): WaterfallBranch | null {
  const exact = state.branches.find((b) => b.when === deathOrder);
  if (exact) return exact;
  const always = state.branches.find((b) => b.when === "always");
  if (always) return always;
  return null;
}
