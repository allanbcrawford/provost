import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily, seedSignal } from "./_helpers";
import { modules } from "./_modules";

describe("signals — F-2 member scoping", () => {
  it("admin sees all signals in their family", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    await seedSignal(t, {
      familyId: fam.familyId,
      ownerUserId: fam.adminUserId,
      memberIds: [fam.memberUserId],
      title: "S1 — names member",
    });
    await seedSignal(t, {
      familyId: fam.familyId,
      ownerUserId: fam.adminUserId,
      memberIds: [],
      title: "S2 — names nobody",
    });

    const admin = asSubject(t, fam.adminClerkSubject);
    const result = await admin.query(api.signals.listAll, { familyId: fam.familyId });
    expect(result.length).toBe(2);
    expect(result.map((s) => s.title).sort()).toEqual(["S1 — names member", "S2 — names nobody"]);
  });

  it("member sees only signals where they're in member_ids[]", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    await seedSignal(t, {
      familyId: fam.familyId,
      ownerUserId: fam.adminUserId,
      memberIds: [fam.memberUserId],
      title: "S1 — names member",
    });
    await seedSignal(t, {
      familyId: fam.familyId,
      ownerUserId: fam.adminUserId,
      memberIds: [fam.otherMemberUserId],
      title: "S2 — names other",
    });
    await seedSignal(t, {
      familyId: fam.familyId,
      ownerUserId: fam.adminUserId,
      memberIds: [],
      title: "S3 — names nobody",
    });

    const member = asSubject(t, fam.memberClerkSubject);
    const result = await member.query(api.signals.listAll, { familyId: fam.familyId });
    expect(result.length).toBe(1);
    expect(result[0]!.title).toBe("S1 — names member");
  });

  it("member of family A cannot read signals in family B", async () => {
    const t = convexTest(schema, modules);
    const famA = await seedFamily(t, "FamA");
    const famB = await seedFamily(t, "FamB");
    await seedSignal(t, {
      familyId: famB.familyId,
      ownerUserId: famB.adminUserId,
      memberIds: [famB.memberUserId],
      title: "B-signal",
    });

    // famA's member tries to query famB's signals → requireFamilyMember
    // throws FORBIDDEN.
    const aMember = asSubject(t, famA.memberClerkSubject);
    await expect(aMember.query(api.signals.listAll, { familyId: famB.familyId })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });
});
