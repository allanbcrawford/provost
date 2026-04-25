import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireFamilyMember } from "./lib/authz";

// Professionals are per-family. There is no global directory in production —
// each family has its own roster of advisors/attorneys/accountants. Cross-
// family lookup is forbidden.
export const list = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    return await ctx.db
      .query("professionals")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
  },
});

export const get = query({
  args: { professionalId: v.id("professionals") },
  handler: async (ctx, { professionalId }) => {
    const pro = await ctx.db.get(professionalId);
    if (!pro) return null;
    if (!pro.family_id) {
      // Pre-migration row that wasn't backfilled. Refuse to expose.
      return null;
    }
    await requireFamilyMember(ctx, pro.family_id);
    return pro;
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    profession: v.string(),
    firm: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { familyId, name, profession, firm, email }) => {
    await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);
    return await ctx.db.insert("professionals", {
      family_id: familyId,
      name,
      profession,
      firm,
      email,
    });
  },
});

// Internal directory: family members whose family_users row has an
// employment_role set. These are people on the family's payroll (e.g. CFO,
// Family Office Director) — distinct from External professionals (advisors
// from outside firms).
export const listInternal = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const internal = memberships.filter((m) => m.employment_role !== undefined);
    const users = await Promise.all(internal.map((m) => ctx.db.get(m.user_id)));
    return internal
      .map((m, i) => {
        const u = users[i] as Doc<"users"> | null;
        if (!u || u.deleted_at) return null;
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
        return {
          membership_id: m._id,
          user_id: u._id,
          name,
          email: u.email,
          family_role: m.role,
          employment_role: m.employment_role ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

// Set or clear the employment_role on an existing family_users row. Admin or
// advisor only; clears with empty string.
export const setEmploymentRole = mutation({
  args: {
    familyId: v.id("families"),
    userId: v.id("users"),
    employmentRole: v.string(),
  },
  handler: async (ctx, { familyId, userId, employmentRole }) => {
    await requireFamilyMember(ctx, familyId, ["admin", "advisor"]);
    const target = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) => q.eq("family_id", familyId).eq("user_id", userId))
      .unique();
    if (!target) throw new ConvexError({ code: "NOT_IN_FAMILY" });
    const trimmed = employmentRole.trim();
    await ctx.db.patch(target._id, {
      employment_role: trimmed.length > 0 ? trimmed : undefined,
    });
    return null;
  },
});
