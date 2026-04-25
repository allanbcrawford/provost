import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

describe("party grants on resource creation", () => {
  it("documents.create grants 'owner' party to the creator", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const admin = asSubject(t, fam.adminClerkSubject);
    const docId = await admin.mutation(api.documents.create, {
      familyId: fam.familyId,
      name: "Trust v1",
      category: "estate",
      type: "trust",
    });
    const parties = await t.run((ctx) =>
      ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) => q.eq("resource_type", "document").eq("resource_id", docId))
        .collect(),
    );
    expect(parties.length).toBe(1);
    expect(parties[0]?.user_id).toBe(fam.adminUserId);
    expect(parties[0]?.role).toBe("owner");
  });

  it("documents.create requires admin role; member is rejected", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const member = asSubject(t, fam.memberClerkSubject);
    await expect(
      member.mutation(api.documents.create, {
        familyId: fam.familyId,
        name: "Bad",
        category: "estate",
        type: "trust",
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("simulations.save grants 'owner' party so creator can read their saved scenario", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const admin = asSubject(t, fam.adminClerkSubject);
    const simId = await admin.mutation(api.simulations.save, {
      familyId: fam.familyId,
      name: "Scenario A",
      state: { revisions: {} },
    });
    const parties = await t.run((ctx) =>
      ctx.db
        .query("resource_parties")
        .withIndex("by_resource", (q) =>
          q.eq("resource_type", "waterfall").eq("resource_id", simId),
        )
        .collect(),
    );
    expect(parties.find((p) => p.user_id === fam.adminUserId)?.role).toBe("owner");
  });
});
