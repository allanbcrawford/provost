// One-shot backfill that populates `resource_parties` for resources created
// before the ACL layer existed. Idempotent — safe to re-run. Invoke via:
//
//   npx convex run aclBackfill:backfillAll
//
// Strategy per resource type:
//   - If the resource carries a creator field, grant that user `owner`.
//   - Otherwise, pick the first family admin and grant them `owner` (so the
//     family always has at least one party that can see the resource once the
//     party-check flag flips).
//   - For signals: also grant `party` to each `member_ids[]` entry.
//   - For tasks: also grant `party` to a member-type assignee.
//   - For documents/observations: no per-record member references in schema
//     today, so members get visibility only via explicit `addParty` later.
//
// This mutation does NOT toggle the feature flag — that lives in the Convex
// env (`ACL_PARTY_CHECK_ENABLED`). Run backfill first, verify counts, then
// flip the flag.

import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { grantParty, type ResourceType } from "./lib/acl";

async function pickFamilyAdmin(
  ctx: MutationCtx,
  familyId: Id<"families">,
): Promise<Id<"users"> | null> {
  const memberships = await ctx.db
    .query("family_users")
    .withIndex("by_family", (q) => q.eq("family_id", familyId))
    .collect();
  const admin = memberships.find((m) => m.role === "admin");
  return admin?.user_id ?? memberships[0]?.user_id ?? null;
}

type Granted = { type: ResourceType; resourceId: string; userId: Id<"users">; role: string };

async function grantOwnerWithFallback(
  ctx: MutationCtx,
  args: {
    familyId: Id<"families">;
    resourceType: ResourceType;
    resourceId: string;
    explicitCreator: Id<"users"> | undefined;
    adminCache: Map<Id<"families">, Id<"users"> | null>;
  },
  log: Granted[],
): Promise<void> {
  let creator = args.explicitCreator;
  if (!creator) {
    if (!args.adminCache.has(args.familyId)) {
      args.adminCache.set(args.familyId, await pickFamilyAdmin(ctx, args.familyId));
    }
    creator = args.adminCache.get(args.familyId) ?? undefined;
  }
  if (!creator) return;
  await grantParty(ctx, {
    familyId: args.familyId,
    resourceType: args.resourceType,
    resourceId: args.resourceId,
    userId: creator,
    role: "owner",
    grantedBy: creator,
  });
  log.push({
    type: args.resourceType,
    resourceId: args.resourceId,
    userId: creator,
    role: "owner",
  });
}

export const backfillAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adminCache = new Map<Id<"families">, Id<"users"> | null>();
    const granted: Granted[] = [];

    // Documents — no creator field. Fall back to family admin.
    const documents = await ctx.db.query("documents").collect();
    for (const d of documents) {
      if (d.deleted_at) continue;
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: d.family_id,
          resourceType: "document",
          resourceId: d._id,
          explicitCreator: undefined,
          adminCache,
        },
        granted,
      );
    }

    // Observations — no creator field. Fall back to family admin.
    const observations = await ctx.db.query("observations").collect();
    for (const o of observations) {
      if (o.deleted_at) continue;
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: o.family_id,
          resourceType: "observation",
          resourceId: o._id,
          explicitCreator: undefined,
          adminCache,
        },
        granted,
      );
    }

    // Signals — no creator field. Fall back to admin; grant party to member_ids[].
    const signals = await ctx.db.query("signals").collect();
    for (const s of signals) {
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: s.family_id,
          resourceType: "signal",
          resourceId: s._id,
          explicitCreator: undefined,
          adminCache,
        },
        granted,
      );
      const ownerForGrant =
        adminCache.get(s.family_id) ?? (await pickFamilyAdmin(ctx, s.family_id));
      if (!ownerForGrant) continue;
      for (const memberId of s.member_ids ?? []) {
        await grantParty(ctx, {
          familyId: s.family_id,
          resourceType: "signal",
          resourceId: s._id,
          userId: memberId,
          role: "party",
          grantedBy: ownerForGrant,
        });
        granted.push({ type: "signal", resourceId: s._id, userId: memberId, role: "party" });
      }
    }

    // Tasks — has `created_by`. Member-type assignee gets `party`.
    const tasks = await ctx.db.query("tasks").collect();
    for (const t of tasks) {
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: t.family_id,
          resourceType: "task",
          resourceId: t._id,
          explicitCreator: t.created_by,
          adminCache,
        },
        granted,
      );
      if (t.assignee_type === "member" && t.assignee_id) {
        try {
          const assigneeId = t.assignee_id as Id<"users">;
          await grantParty(ctx, {
            familyId: t.family_id,
            resourceType: "task",
            resourceId: t._id,
            userId: assigneeId,
            role: "party",
            grantedBy: t.created_by,
          });
          granted.push({ type: "task", resourceId: t._id, userId: assigneeId, role: "party" });
        } catch (err) {
          // assignee_id is a string in schema; if it's not a real user id, skip.
          if (!(err instanceof ConvexError)) throw err;
        }
      }
    }

    // Waterfalls — no creator field. Fall back to family admin.
    const waterfalls = await ctx.db.query("waterfalls").collect();
    for (const w of waterfalls) {
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: w.family_id,
          resourceType: "waterfall",
          resourceId: w._id,
          explicitCreator: undefined,
          adminCache,
        },
        granted,
      );
    }

    // Assets — no creator field. Fall back to family admin.
    const assets = await ctx.db.query("assets").collect();
    for (const a of assets) {
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: a.family_id,
          resourceType: "asset",
          resourceId: a._id,
          explicitCreator: undefined,
          adminCache,
        },
        granted,
      );
    }

    // Memories — has `created_by_user_id`.
    const memories = await ctx.db.query("family_memories").collect();
    for (const m of memories) {
      await grantOwnerWithFallback(
        ctx,
        {
          familyId: m.family_id,
          resourceType: "memory",
          resourceId: m._id,
          explicitCreator: m.created_by_user_id,
          adminCache,
        },
        granted,
      );
    }

    return {
      counts: {
        documents: documents.length,
        observations: observations.length,
        signals: signals.length,
        tasks: tasks.length,
        waterfalls: waterfalls.length,
        assets: assets.length,
        memories: memories.length,
      },
      grantsWritten: granted.length,
    };
  },
});

// Diagnostic: simulate filterByAccess for every (family, member) pair on
// documents and signals. Returns counts per member showing how many resources
// they would see. Admins should see all; members should see only their party
// rows. This is the safety check before turning members loose on the UI.
export const previewAccess = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    const allDocuments = await ctx.db.query("documents").collect();
    const allSignals = await ctx.db.query("signals").collect();

    type Row = {
      familyName: string;
      member: string;
      role: string;
      docsVisible: number;
      docsTotal: number;
      signalsVisible: number;
      signalsTotal: number;
    };
    const rows: Row[] = [];

    for (const f of families) {
      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const familyDocs = allDocuments.filter((d) => d.family_id === f._id && !d.deleted_at);
      const familySignals = allSignals.filter((s) => s.family_id === f._id);

      for (const m of memberships) {
        const u = await ctx.db.get(m.user_id);
        if (!u) continue;

        const memberDocParties = await ctx.db
          .query("resource_parties")
          .withIndex("by_user_and_type", (q) =>
            q.eq("user_id", m.user_id).eq("resource_type", "document"),
          )
          .collect();
        const memberSignalParties = await ctx.db
          .query("resource_parties")
          .withIndex("by_user_and_type", (q) =>
            q.eq("user_id", m.user_id).eq("resource_type", "signal"),
          )
          .collect();
        const docIds = new Set(memberDocParties.map((p) => p.resource_id));
        const sigIds = new Set(memberSignalParties.map((p) => p.resource_id));

        const isBypass = m.role === "admin" || m.role === "advisor" || m.role === "trustee";
        rows.push({
          familyName: f.name,
          member: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
          role: m.role,
          docsTotal: familyDocs.length,
          docsVisible: isBypass
            ? familyDocs.length
            : familyDocs.filter((d) => docIds.has(d._id)).length,
          signalsTotal: familySignals.length,
          signalsVisible: isBypass
            ? familySignals.length
            : familySignals.filter((s) => sigIds.has(s._id)).length,
        });
      }
    }

    return { rows };
  },
});

// Stage 6 — assign every legacy `professionals` row (no family_id) to a family.
// Strategy: assign to the only existing family if there's exactly one; otherwise
// log and skip. Run after schema migration:
//
//   npx convex run aclBackfill:backfillProfessionalsFamily
export const backfillProfessionalsFamily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    if (families.length === 0) return { assigned: 0, reason: "no families" as const };
    if (families.length > 1) {
      return {
        assigned: 0,
        reason: "multiple families — manual assignment required" as const,
        familyCount: families.length,
      };
    }
    const familyId = families[0]?._id;

    const professionals = await ctx.db.query("professionals").collect();
    let assigned = 0;
    for (const p of professionals) {
      if (p.family_id) continue;
      await ctx.db.patch(p._id, { family_id: familyId });
      assigned++;
    }
    return { assigned, totalRows: professionals.length };
  },
});

// Demo helper: insert a handful of asset rows for the first family if none
// exist. Mirrors the asset mix from the PRD's Williams sample (~$92.4M total).
//
//   npx convex run aclBackfill:seedDemoAssets
export const seedDemoAssets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    if (families.length === 0) return { inserted: 0, reason: "no families" as const };
    const family = families[0]!;
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", family._id))
      .collect();
    const adminId = memberships.find((m) => m.role === "admin")?.user_id ?? memberships[0]?.user_id;
    if (!adminId) return { inserted: 0, reason: "no admin" as const };

    const existing = await ctx.db
      .query("assets")
      .withIndex("by_family", (q) => q.eq("family_id", family._id))
      .collect();
    if (existing.length > 0) {
      return { inserted: 0, reason: "already seeded" as const };
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows: Array<{ name: string; type: string; value: number }> = [
      { name: "Schwab Brokerage — Joint", type: "Brokerage", value: 24_000_000 },
      { name: "Vanguard Brokerage — Trust", type: "Brokerage", value: 12_500_000 },
      { name: "Sequoia Growth Fund VII", type: "Private Equity", value: 18_000_000 },
      { name: "Pasadena Estate", type: "Real Estate", value: 9_200_000 },
      { name: "Lake Tahoe Cabin", type: "Real Estate", value: 4_400_000 },
      { name: "Wells Fargo Operating", type: "Checking", value: 1_800_000 },
      { name: "Williams Holdings LLC", type: "Entities", value: 22_500_000 },
    ];
    for (const r of rows) {
      const assetId = await ctx.db.insert("assets", {
        family_id: family._id,
        name: r.name,
        type: r.type,
        value: r.value,
        currency: "USD",
        as_of_date: today,
      });
      await grantParty(ctx, {
        familyId: family._id,
        resourceType: "asset",
        resourceId: assetId,
        userId: adminId,
        role: "owner",
        grantedBy: adminId,
      });
      // Mirror the seedDevShares pattern: every family member can view in dev.
      for (const m of memberships) {
        if (m.user_id === adminId) continue;
        await grantParty(ctx, {
          familyId: family._id,
          resourceType: "asset",
          resourceId: assetId,
          userId: m.user_id,
          role: "party",
          grantedBy: adminId,
        });
      }
    }
    return { inserted: rows.length, family: family.name };
  },
});

// Demo helper: grants every family member a `party` row on every family-scoped
// resource in their family. Useful in dev so the UI matches pre-ACL behavior
// for a demo audience that hasn't yet wired up explicit sharing. Cross-family
// isolation is still enforced (the helper only grants within a family). Run
// after a seed reset:
//
//   npx convex run aclBackfill:seedDevShares
//
// In production, do NOT run this — explicit sharing via the upcoming Stage 4
// UI is the intended path.
export const seedDevShares = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    let granted = 0;
    for (const f of families) {
      const memberships = await ctx.db
        .query("family_users")
        .withIndex("by_family", (q) => q.eq("family_id", f._id))
        .collect();
      const memberIds = memberships.map((m) => m.user_id);
      const adminId = memberships.find((m) => m.role === "admin")?.user_id ?? memberIds[0];
      if (!adminId) continue;

      const families_resources: Array<{
        type: ResourceType;
        rows: { _id: string }[];
      }> = [
        {
          type: "document",
          rows: (
            await ctx.db
              .query("documents")
              .withIndex("by_family", (q) => q.eq("family_id", f._id))
              .collect()
          ).filter((r) => !r.deleted_at),
        },
        {
          type: "observation",
          rows: (
            await ctx.db
              .query("observations")
              .withIndex("by_family", (q) => q.eq("family_id", f._id))
              .collect()
          ).filter((r) => !r.deleted_at),
        },
        {
          type: "signal",
          rows: await ctx.db
            .query("signals")
            .withIndex("by_family", (q) => q.eq("family_id", f._id))
            .collect(),
        },
        {
          type: "waterfall",
          rows: await ctx.db
            .query("waterfalls")
            .withIndex("by_family", (q) => q.eq("family_id", f._id))
            .collect(),
        },
        {
          type: "asset",
          rows: await ctx.db
            .query("assets")
            .withIndex("by_family", (q) => q.eq("family_id", f._id))
            .collect(),
        },
        {
          type: "task",
          rows: await ctx.db
            .query("tasks")
            .withIndex("by_family", (q) => q.eq("family_id", f._id))
            .collect(),
        },
      ];

      for (const { type, rows } of families_resources) {
        for (const r of rows) {
          for (const memberId of memberIds) {
            await grantParty(ctx, {
              familyId: f._id,
              resourceType: type,
              resourceId: r._id,
              userId: memberId,
              role: "party",
              grantedBy: adminId,
            });
            granted++;
          }
        }
      }
    }
    return { grantsAttempted: granted };
  },
});

// Diagnostic: returns the value of the runtime flag and the bypass map. Useful
// to confirm that `npx convex env set ACL_PARTY_CHECK_ENABLED true` was picked
// up by the running deployment.
export const flagState = internalMutation({
  args: {},
  handler: async () => {
    return {
      partyCheckEnabled: process.env.ACL_PARTY_CHECK_ENABLED === "true",
      raw: process.env.ACL_PARTY_CHECK_ENABLED ?? null,
    };
  },
});

// Sanity-check query — no writes. Returns party counts per resource type,
// and a sample of resources with zero parties (which would be invisible to
// non-bypass roles after the flag flips). Run before flipping the flag.
export const inspect = internalMutation({
  args: {},
  handler: async (ctx) => {
    const parties = await ctx.db.query("resource_parties").collect();
    const partiesByResource = new Map<string, Doc<"resource_parties">[]>();
    for (const p of parties) {
      const key = `${p.resource_type}:${p.resource_id}`;
      const list = partiesByResource.get(key) ?? [];
      list.push(p);
      partiesByResource.set(key, list);
    }

    async function findOrphans<
      TableName extends
        | "documents"
        | "observations"
        | "signals"
        | "tasks"
        | "waterfalls"
        | "assets"
        | "family_memories",
    >(
      table: TableName,
      type: ResourceType,
    ): Promise<{ total: number; orphans: number; sampleOrphanIds: string[] }> {
      const rows = await ctx.db.query(table).collect();
      const orphans = rows.filter((r) => !partiesByResource.has(`${type}:${r._id}`));
      return {
        total: rows.length,
        orphans: orphans.length,
        sampleOrphanIds: orphans.slice(0, 5).map((r) => r._id),
      };
    }

    return {
      partyCount: parties.length,
      byType: {
        document: await findOrphans("documents", "document"),
        observation: await findOrphans("observations", "observation"),
        signal: await findOrphans("signals", "signal"),
        task: await findOrphans("tasks", "task"),
        waterfall: await findOrphans("waterfalls", "waterfall"),
        asset: await findOrphans("assets", "asset"),
        memory: await findOrphans("family_memories", "memory"),
      },
    };
  },
});
