"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { log } from "../lib/log";

/**
 * Weekly per-family digest. Gathers pending approvals, new signals, and open
 * tasks, and emits a structured payload per family admin. Email delivery is
 * stubbed (Phase 7 will wire Resend/SES). For now this lands as a structured
 * log the ops runbook can scrape + an audit trail.
 */
export const weeklyDigest = internalAction({
  args: {},
  handler: async (ctx): Promise<{ families: number; delivered: number; skipped: number }> => {
    const summaries: Array<{
      familyId: string;
      familyName: string;
      admins: Array<{ userId: string; email: string; name: string }>;
      pendingApprovals: number;
      newSignals: number;
      openTasks: number;
    }> = await ctx.runQuery(internal.agent.digestInternal.buildFamilyDigests, {});

    let delivered = 0;
    let skipped = 0;
    for (const s of summaries) {
      if (s.pendingApprovals === 0 && s.newSignals === 0 && s.openTasks === 0) {
        skipped++;
        continue;
      }
      for (const admin of s.admins) {
        log("info", "digest.email.queued", {
          toUserId: admin.userId,
          toEmail: admin.email,
          familyId: s.familyId,
          familyName: s.familyName,
          pendingApprovals: s.pendingApprovals,
          newSignals: s.newSignals,
          openTasks: s.openTasks,
          note: "TODO phase-7: send real email via Resend/SES",
        });
        delivered++;
      }
      await ctx.runMutation(internal.agent.digestInternal.recordDelivery, {
        familyId: s.familyId as never,
        pendingApprovals: s.pendingApprovals,
        newSignals: s.newSignals,
        openTasks: s.openTasks,
      });
    }
    return { families: summaries.length, delivered, skipped };
  },
});
