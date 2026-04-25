// Pure unit tests for the waterfall state shape + branch selection helper.
// No Convex sandbox needed — the validator and selectBranch are both pure
// functions. The engine team (task #41) gets to rely on these guarantees
// when wiring the actual distribution math.

import { describe, expect, it } from "vitest";
import {
  parseWaterfallState,
  safeParseWaterfallState,
  selectBranch,
  type WaterfallState,
} from "../convex/lib/waterfallState";

const baseState: WaterfallState = {
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
        { beneficiaryId: "david", share: 0.33 },
        { beneficiaryId: "jennifer", share: 0.34 },
        { beneficiaryId: "michael", share: 0.33 },
      ],
    },
  ],
};

describe("waterfallState validator", () => {
  it("accepts a well-formed three-branch trust state", () => {
    expect(() => parseWaterfallState(baseState)).not.toThrow();
  });

  it("rejects a share outside [0,1] with a field-level zod issue", () => {
    const bad = {
      ...baseState,
      branches: [
        {
          when: "robert-first" as const,
          distributions: [{ beneficiaryId: "linda", share: 1.5 }],
        },
      ],
    };
    const result = safeParseWaterfallState(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Zod path should point at the offending share field so the UI can
      // surface a precise error.
      const sharePath = result.issues.find((i) => i.path.includes("share"));
      expect(sharePath).toBeDefined();
    }
  });

  it("rejects an unknown priority_class literal", () => {
    const bad = { ...baseState, priority_class: 3 };
    expect(() => parseWaterfallState(bad)).toThrow();
  });
});

describe("selectBranch", () => {
  it("picks the exact-match branch for the requested death order", () => {
    const branch = selectBranch(baseState, "robert-first");
    expect(branch?.when).toBe("robert-first");
    expect(branch?.distributions[0]?.beneficiaryId).toBe("linda");
  });

  it("returns the simultaneous branch when both spouses go at once", () => {
    const branch = selectBranch(baseState, "simultaneous");
    expect(branch?.when).toBe("simultaneous");
    expect(branch?.distributions).toHaveLength(3);
    const totalShare = branch?.distributions.reduce((sum, d) => sum + d.share, 0);
    // Three children at 0.33/0.34/0.33 — sums to 1.0 within float tolerance.
    expect(totalShare).toBeCloseTo(1.0, 5);
  });

  it("falls back to the `always` branch when no exact match exists", () => {
    const ilitState: WaterfallState = {
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
    const branch = selectBranch(ilitState, "robert-first");
    expect(branch?.when).toBe("always");
  });

  it("returns null when neither an exact match nor an `always` branch exists", () => {
    // Only encodes the simultaneous case; the engine should flag this
    // document as not having an applicable branch when asked about
    // robert-first.
    const partial: WaterfallState = {
      priority_class: 0,
      branches: [
        {
          when: "simultaneous",
          distributions: [{ beneficiaryId: "david", share: 1.0 }],
        },
      ],
    };
    expect(selectBranch(partial, "robert-first")).toBeNull();
    expect(selectBranch(partial, "linda-first")).toBeNull();
    expect(selectBranch(partial, "simultaneous")?.when).toBe("simultaneous");
  });

  it("prefers the exact branch over `always` when both are present", () => {
    const mixed: WaterfallState = {
      priority_class: 2,
      branches: [
        {
          when: "always",
          distributions: [{ beneficiaryId: "revocable-trust", share: 1.0 }],
        },
        {
          when: "robert-first",
          distributions: [{ beneficiaryId: "linda", share: 1.0 }],
        },
      ],
    };
    const branch = selectBranch(mixed, "robert-first");
    expect(branch?.when).toBe("robert-first");
    expect(branch?.distributions[0]?.beneficiaryId).toBe("linda");
  });
});
