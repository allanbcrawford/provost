// One-shot backfill that populates `family_users.lifecycle_status` for
// memberships created before the lifecycle field existed. Idempotent —
// only patches rows where lifecycle_status is undefined. Invoke via:
//
//   npx convex run lifecycleBackfill:backfillAll
//
// Default is "active" — preserves existing behavior for all current members.
// New email invites going forward come in as "invited" via
// users.addUserToFamilyByEmail; they flip to "active" on first Clerk link.

import { internalMutation } from "./_generated/server";

export const backfillAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const memberships = await ctx.db.query("family_users").collect();
    let patched = 0;
    for (const m of memberships) {
      if (m.lifecycle_status !== undefined) continue;
      await ctx.db.patch(m._id, { lifecycle_status: "active" });
      patched++;
    }
    return { total: memberships.length, patched };
  },
});
