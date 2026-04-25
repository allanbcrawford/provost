import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { asSubject, seedFamily } from "./_helpers";
import { modules } from "./_modules";

describe("library globals fence — site-admin only", () => {
  it("library.listSources excludes globals from the family-scoped listing", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("library_sources", {
        family_id: fam.familyId,
        title: "Family-scoped source",
        category: "estate",
        content: "...",
        tags: {},
      });
      await ctx.db.insert("library_sources", {
        // family_id intentionally omitted → global
        title: "Global authoring source",
        category: "estate",
        content: "...",
        tags: {},
      });
    });

    const admin = asSubject(t, fam.adminClerkSubject);
    const result = await admin.query(api.library.listSources, { familyId: fam.familyId });
    expect(result.length).toBe(1);
    expect(result[0]?.title).toBe("Family-scoped source");
  });

  it("library.getSource refuses to return a global to a family user", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const globalId = await t.run(async (ctx) =>
      ctx.db.insert("library_sources", {
        title: "Global authoring source",
        category: "estate",
        content: "secret authoring content",
        tags: {},
      }),
    );

    const admin = asSubject(t, fam.adminClerkSubject);
    const result = await admin.query(api.library.getSource, { sourceId: globalId });
    expect(result).toBeNull();
  });

  it("knowledgeHydrate.getLibrarySource drops globals so chat searches don't surface them", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const globalId = await t.run(async (ctx) =>
      ctx.db.insert("library_sources", {
        title: "Global",
        category: "estate",
        content: "...",
        tags: {},
      }),
    );

    // Internal queries are callable from tests; the global must come back null.
    const result = await t.query(internal.agent.knowledgeHydrate.getLibrarySource, {
      sourceId: globalId,
      familyId: fam.familyId,
    });
    expect(result).toBeNull();
  });

  it("knowledgeHydrate.getLibrarySource returns family-scoped rows for the matching family", async () => {
    const t = convexTest(schema, modules);
    const fam = await seedFamily(t);
    const familyScopedId = await t.run(async (ctx) =>
      ctx.db.insert("library_sources", {
        family_id: fam.familyId,
        title: "Family scoped",
        category: "estate",
        content: "abc",
        tags: {},
      }),
    );
    const result = await t.query(internal.agent.knowledgeHydrate.getLibrarySource, {
      sourceId: familyScopedId,
      familyId: fam.familyId,
    });
    expect(result?.title).toBe("Family scoped");
  });
});
