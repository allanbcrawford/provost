// Curriculum edits migration — Brad's 9 (11 effective) margin notes from
// `education-brad-feedback.md`. Idempotent. Brad-blocked: this migration is
// authored, committed, and ready to run, but is NOT auto-run on deploy.
// It executes manually after Brad signs off (per
// `docs/brad-decisions-2026-04.md` decision #6, recommended default APPLY).
//
// To dry-run (default — reports what would change without writing):
//
//   npx convex run migrations/curriculumEdits202604:applyCurriculumEdits2026_04
//
// To actually apply the edits, pass `confirmIntent`:
//
//   npx convex run migrations/curriculumEdits202604:applyCurriculumEdits2026_04 \
//     '{"confirmIntent": true}'
//
// Idempotency strategy:
//   - Renames check the current title; skip if already at target.
//   - Deletes check existence (and `deleted_at`); skip if already gone.
//   - Inserts check by intended title within the target track/program; skip
//     if a live lesson with that title already exists for the family.
//   - "Verify only" edits read state and report; never write.
//   - Priority changes (Core / Extended / Exploratory) patch
//     `lessons.priority` to the lowercased target value. Item 5.5.3 added the
//     schema field; rows that already match the target are skipped with
//     `already_set`. Lessons that don't exist in the DB (e.g. fresh demo
//     seed) are skipped with `lesson_not_found`.
//
// Schema-honest behavior:
//   The seed JSON `convex/seed_data/lessons.json` does not (today) contain
//   any of Brad's lesson titles — those titles live in production curriculum
//   that was authored outside the demo seed. The companion seed update is
//   therefore a no-op for content edits and only adds a changelog header
//   noting the migration is the source of truth for new deployments. See
//   `convex/seed_data/lessons.changelog.md`.

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";

const AUDIT_ACTION = "curriculum.migration.2026-04";

type EditStatus = "applied" | "skipped" | "failed";

type EditResult = {
  edit: string;
  status: EditStatus;
  reason?: string;
  affectedLessonIds?: string[];
  affectedFamilies?: number;
};

type Phase = "emerging" | "developing" | "operating" | "enduring";

// Each edit is a self-contained idempotent operation. Order matters only for
// deletions-then-inserts within the same track (sort_order math).
type LessonRef = {
  // Human title to match against `lessons.title`. Case-sensitive exact match
  // — Brad's feedback uses canonical titles. If a future curriculum revision
  // changes capitalization we will land a follow-up migration.
  title: string;
  phase: Phase;
};

type RenameEdit = {
  kind: "rename";
  id: string; // stable handle used in summary + audit
  from: LessonRef;
  toTitle: string;
};

type DeleteEdit = {
  kind: "delete";
  id: string;
  target: LessonRef;
};

type InsertEdit = {
  kind: "insert";
  id: string;
  // Where the new lesson goes. We resolve the target program by phase, then
  // pick a track by title. If the track doesn't exist yet (fresh DB) we
  // record `failed` with reason `track_not_found` — humans must seed the
  // track first.
  programPhase: Phase;
  trackTitle: string;
  newTitle: string;
  description: string;
  category: string;
  // Relative ordering within the track. The migration places the new lesson
  // BEFORE any existing lesson whose title is in `insertBeforeTitles`, by
  // computing a fractional sort_order. If no anchor matches, the new
  // lesson goes to the end.
  insertBeforeTitles?: string[];
};

type DescriptionEdit = {
  kind: "description";
  id: string;
  target: LessonRef;
  // We only patch description if the current description does NOT already
  // contain the marker substring (cheap idempotency check).
  marker: string;
  newDescription: string;
};

type VerifyOrderEdit = {
  kind: "verifyOrder";
  id: string;
  programPhase: Phase;
  trackTitle: string;
  expectedOrder: string[]; // titles, in expected sort_order order
};

type PriorityEdit = {
  kind: "priority";
  id: string;
  target: LessonRef;
  newPriority: "Core" | "Extended" | "Exploratory";
};

type FlagEdit = {
  kind: "flag";
  id: string;
  target: LessonRef;
  reason: string;
};

type Edit =
  | RenameEdit
  | DeleteEdit
  | InsertEdit
  | DescriptionEdit
  | VerifyOrderEdit
  | PriorityEdit
  | FlagEdit;

// Brad's 11 effective edits, encoded verbatim.
const EDITS: Edit[] = [
  // 1. 1.5 Income & Tax Basics, lesson 4 — expand description.
  {
    kind: "description",
    id: "1-income-sources-expand",
    target: { title: "Income Sources", phase: "emerging" },
    marker: "earned/passive/trust-distribution",
    newDescription:
      "Enumerates income types — earned, passive, and trust-distribution categories — and explains the difference between ordinary income and capital-gains tax treatment.",
  },
  // 2. 2.2 Making Money Work, lessons 1 & 2 — verify order only.
  {
    kind: "verifyOrder",
    id: "2-making-money-work-order",
    programPhase: "developing",
    trackTitle: "Making Money Work",
    expectedOrder: ["Investing Psychology", "Capital Markets"],
  },
  // 3a. Delete "Building Blocks of Investing" from Developing.
  {
    kind: "delete",
    id: "3a-delete-building-blocks-developing",
    target: { title: "Building Blocks of Investing", phase: "developing" },
  },
  // 3b. Insert "Asset Classes" in Operating / Institutional Investing.
  {
    kind: "insert",
    id: "3b-insert-asset-classes",
    programPhase: "operating",
    trackTitle: "Institutional Investing",
    newTitle: "Asset Classes",
    description:
      "Surveys the major asset classes available to institutional investors and the role each plays in a diversified portfolio.",
    category: "Investing",
  },
  // 3c. Insert "Asset Allocation" right after Asset Classes.
  {
    kind: "insert",
    id: "3c-insert-asset-allocation",
    programPhase: "operating",
    trackTitle: "Institutional Investing",
    newTitle: "Asset Allocation",
    description:
      "Introduces asset allocation as the strategic blueprint for combining asset classes to match risk tolerance, time horizon, and family goals.",
    category: "Investing",
  },
  // 4a. Delete "How Assets Actually Transfer".
  {
    kind: "delete",
    id: "4a-delete-how-assets-actually-transfer",
    target: { title: "How Assets Actually Transfer", phase: "developing" },
  },
  // 4b. Insert "Titling of Assets".
  {
    kind: "insert",
    id: "4b-insert-titling-of-assets",
    programPhase: "developing",
    trackTitle: "Protecting What You've Built",
    newTitle: "Titling of Assets",
    description:
      "Explains how the way an asset is titled (sole, joint, tenancy-in-common, etc.) controls who owns it and how it transfers.",
    category: "Estate Planning",
  },
  // 4c. Insert "Beneficiary Designations Outside Your Will".
  {
    kind: "insert",
    id: "4c-insert-beneficiary-designations",
    programPhase: "developing",
    trackTitle: "Protecting What You've Built",
    newTitle: "Beneficiary Designations Outside Your Will",
    description:
      "Covers the non-probate transfer paths — retirement accounts, life insurance, TOD/POD — that operate independent of a will.",
    category: "Estate Planning",
  },
  // 5. Rename "When You Can't Speak for Yourself" → "Powers of Attorney: Financial and Medical".
  {
    kind: "rename",
    id: "5-rename-powers-of-attorney",
    from: { title: "When You Can't Speak for Yourself", phase: "developing" },
    toTitle: "Powers of Attorney: Financial and Medical",
  },
  // 6. Flag "Entity-Level Tax Strategy" — Brad to provide new title.
  {
    kind: "flag",
    id: "6-flag-entity-level-tax-strategy",
    target: { title: "Entity-Level Tax Strategy", phase: "operating" },
    reason:
      "Brad-blocked: needs clearer title/scope. DO NOT change until Brad gives the new title.",
  },
  // 7a. Delete "$27.98M Window".
  {
    kind: "delete",
    id: "7a-delete-2798m-window",
    target: { title: "$27.98M Window", phase: "operating" },
  },
  // 7b. Insert "Wealth Transfer Taxes Basics".
  {
    kind: "insert",
    id: "7b-insert-wealth-transfer-taxes-basics",
    programPhase: "operating",
    trackTitle: "Next-Level Estate Strategy",
    newTitle: "Wealth Transfer Taxes Basics",
    description:
      "Foundational lesson on estate, gift, and generation-skipping transfer taxes — what they are, who pays, and when they apply.",
    category: "Estate Planning",
  },
  // 7c. Insert "Using Your Wealth Transfer Exemptions".
  {
    kind: "insert",
    id: "7c-insert-using-wealth-transfer-exemptions",
    programPhase: "operating",
    trackTitle: "Next-Level Estate Strategy",
    newTitle: "Using Your Wealth Transfer Exemptions",
    description:
      "Strategic playbook for deploying lifetime, annual, and GST exemptions before sunset.",
    category: "Estate Planning",
  },
  // 8. "Dynasty Trusts & GST Planning" priority Core → Extended.
  {
    kind: "priority",
    id: "8-priority-dynasty-trusts",
    target: { title: "Dynasty Trusts & GST Planning", phase: "operating" },
    newPriority: "Extended",
  },
  // 9. "Charitable Structures..." priority Extended → Exploratory.
  // Note: title prefix-matched because the feedback doc truncates with "...".
  {
    kind: "priority",
    id: "9-priority-charitable-structures",
    target: { title: "Charitable Structures", phase: "operating" },
    newPriority: "Exploratory",
  },
  // 10. Delete "Across Borders" from operating catalog.
  {
    kind: "delete",
    id: "10-delete-across-borders",
    target: { title: "Across Borders", phase: "operating" },
  },
  // 11. Rename Five Capitals lesson 3.
  {
    kind: "rename",
    id: "11-rename-invisible-assets",
    from: {
      title: "The Assets You Can't Put on a Balance Sheet",
      phase: "enduring",
    },
    toTitle: "Invisible Assets on the Family Balance Sheet",
  },
];

// ---------- helpers ----------

async function findLessonsByTitleAndPhase(
  ctx: MutationCtx,
  title: string,
  phase: Phase,
  options?: { titleMatch?: "exact" | "prefix" },
): Promise<Doc<"lessons">[]> {
  // Resolve all programs of this phase across families, then collect
  // lessons whose track belongs to such a program with matching title.
  const allPrograms = await ctx.db.query("programs").collect();
  const phasePrograms = allPrograms.filter(
    (p) => !p.deleted_at && p.stewardship_phase === phase,
  );
  const programIds = new Set(phasePrograms.map((p) => p._id));
  const phaseFamilyIds = new Set(phasePrograms.map((p) => p.family_id));

  const tracks = await ctx.db.query("tracks").collect();
  const phaseTrackIds = new Set(
    tracks.filter((t) => !t.deleted_at && programIds.has(t.program_id)).map((t) => t._id),
  );

  const out: Doc<"lessons">[] = [];
  for (const familyId of phaseFamilyIds) {
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    for (const l of lessons) {
      if (l.deleted_at) continue;
      // If the lesson has a track_id, it must be in the phase's tracks. If
      // it has none (legacy), allow the match — admins assign later.
      if (l.track_id && !phaseTrackIds.has(l.track_id)) continue;
      const matches =
        options?.titleMatch === "prefix" ? l.title.startsWith(title) : l.title === title;
      if (matches) out.push(l);
    }
  }
  return out;
}

async function findTrack(
  ctx: MutationCtx,
  phase: Phase,
  trackTitle: string,
): Promise<Doc<"tracks">[]> {
  const programs = await ctx.db.query("programs").collect();
  const phasePrograms = programs.filter(
    (p) => !p.deleted_at && p.stewardship_phase === phase,
  );
  const out: Doc<"tracks">[] = [];
  for (const p of phasePrograms) {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_program", (q) => q.eq("program_id", p._id))
      .collect();
    for (const t of tracks) {
      if (t.deleted_at) continue;
      if (t.title === trackTitle) out.push(t);
    }
  }
  return out;
}

async function applyEdit(
  ctx: MutationCtx,
  edit: Edit,
  dryRun: boolean,
): Promise<EditResult> {
  switch (edit.kind) {
    case "rename": {
      const stale = await findLessonsByTitleAndPhase(ctx, edit.from.title, edit.from.phase);
      const alreadyRenamed = await findLessonsByTitleAndPhase(ctx, edit.toTitle, edit.from.phase);
      if (stale.length === 0) {
        return {
          edit: edit.id,
          status: "skipped",
          reason:
            alreadyRenamed.length > 0 ? "already_renamed" : "lesson_not_found",
          affectedFamilies: alreadyRenamed.length,
        };
      }
      if (dryRun) {
        return {
          edit: edit.id,
          status: "applied",
          affectedLessonIds: stale.map((l) => l._id),
          affectedFamilies: stale.length,
        };
      }
      for (const l of stale) {
        await ctx.db.patch(l._id, { title: edit.toTitle });
        await writeAudit(ctx, {
          familyId: l.family_id,
          actorKind: "system",
          category: "mutation",
          action: AUDIT_ACTION,
          resourceType: "lessons",
          resourceId: l._id,
          metadata: {
            edit: edit.id,
            kind: "rename",
            from: edit.from.title,
            to: edit.toTitle,
          },
        });
      }
      return {
        edit: edit.id,
        status: "applied",
        affectedLessonIds: stale.map((l) => l._id),
        affectedFamilies: stale.length,
      };
    }
    case "delete": {
      const found = await findLessonsByTitleAndPhase(
        ctx,
        edit.target.title,
        edit.target.phase,
      );
      if (found.length === 0) {
        return { edit: edit.id, status: "skipped", reason: "already_deleted_or_absent" };
      }
      if (dryRun) {
        return {
          edit: edit.id,
          status: "applied",
          affectedLessonIds: found.map((l) => l._id),
          affectedFamilies: found.length,
        };
      }
      const now = Date.now();
      for (const l of found) {
        await ctx.db.patch(l._id, { deleted_at: now });
        await writeAudit(ctx, {
          familyId: l.family_id,
          actorKind: "system",
          category: "mutation",
          action: AUDIT_ACTION,
          resourceType: "lessons",
          resourceId: l._id,
          metadata: { edit: edit.id, kind: "delete", title: edit.target.title },
        });
      }
      return {
        edit: edit.id,
        status: "applied",
        affectedLessonIds: found.map((l) => l._id),
        affectedFamilies: found.length,
      };
    }
    case "insert": {
      const tracks = await findTrack(ctx, edit.programPhase, edit.trackTitle);
      if (tracks.length === 0) {
        return {
          edit: edit.id,
          status: "failed",
          reason: `track_not_found:${edit.programPhase}/${edit.trackTitle}`,
        };
      }
      const insertedIds: string[] = [];
      let skippedExisting = 0;
      for (const track of tracks) {
        // Idempotency: skip if a live lesson with this title already exists in track.
        const existing = await ctx.db
          .query("lessons")
          .withIndex("by_track", (q) => q.eq("track_id", track._id))
          .collect();
        const live = existing.filter((l) => !l.deleted_at);
        if (live.some((l) => l.title === edit.newTitle)) {
          skippedExisting++;
          continue;
        }
        // Compute sort_order: place before first matching anchor, else at end.
        const sorted = [...live].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
        let newOrder: number;
        const anchorIdx = edit.insertBeforeTitles
          ? sorted.findIndex((l) => edit.insertBeforeTitles?.includes(l.title))
          : -1;
        const anchor = anchorIdx >= 0 ? sorted[anchorIdx] : undefined;
        if (anchor) {
          const prev = anchorIdx > 0 ? sorted[anchorIdx - 1] : undefined;
          const anchorOrder = anchor.sort_order ?? anchorIdx;
          const prevOrder = prev?.sort_order ?? anchorOrder - 1;
          newOrder = (prevOrder + anchorOrder) / 2;
        } else {
          const last = sorted[sorted.length - 1];
          newOrder = (last?.sort_order ?? sorted.length - 1) + 1;
        }
        if (dryRun) {
          insertedIds.push(`dry:${track._id}`);
          continue;
        }
        const newId = await ctx.db.insert("lessons", {
          family_id: track.family_id,
          track_id: track._id,
          sort_order: newOrder,
          title: edit.newTitle,
          description: edit.description,
          category: edit.category,
          content: {},
          format: "article",
          article_markdown: `# ${edit.newTitle}\n\n${edit.description}\n\n> _This lesson was inserted by curriculum migration 2026-04. Body to be authored by curriculum team._`,
        });
        insertedIds.push(newId);
        await writeAudit(ctx, {
          familyId: track.family_id,
          actorKind: "system",
          category: "mutation",
          action: AUDIT_ACTION,
          resourceType: "lessons",
          resourceId: newId,
          metadata: {
            edit: edit.id,
            kind: "insert",
            title: edit.newTitle,
            track: edit.trackTitle,
            phase: edit.programPhase,
            sortOrder: newOrder,
          },
        });
      }
      if (insertedIds.length === 0) {
        return {
          edit: edit.id,
          status: "skipped",
          reason: skippedExisting > 0 ? "already_present" : "no_target_tracks",
        };
      }
      return {
        edit: edit.id,
        status: "applied",
        affectedLessonIds: insertedIds,
        affectedFamilies: insertedIds.length,
      };
    }
    case "description": {
      const found = await findLessonsByTitleAndPhase(
        ctx,
        edit.target.title,
        edit.target.phase,
      );
      if (found.length === 0) {
        return { edit: edit.id, status: "skipped", reason: "lesson_not_found" };
      }
      const needsPatch = found.filter(
        (l) => !(l.description ?? "").includes(edit.marker),
      );
      if (needsPatch.length === 0) {
        return { edit: edit.id, status: "skipped", reason: "marker_already_present" };
      }
      if (dryRun) {
        return {
          edit: edit.id,
          status: "applied",
          affectedLessonIds: needsPatch.map((l) => l._id),
          affectedFamilies: needsPatch.length,
        };
      }
      for (const l of needsPatch) {
        await ctx.db.patch(l._id, { description: edit.newDescription });
        await writeAudit(ctx, {
          familyId: l.family_id,
          actorKind: "system",
          category: "mutation",
          action: AUDIT_ACTION,
          resourceType: "lessons",
          resourceId: l._id,
          metadata: {
            edit: edit.id,
            kind: "description",
            title: edit.target.title,
          },
        });
      }
      return {
        edit: edit.id,
        status: "applied",
        affectedLessonIds: needsPatch.map((l) => l._id),
        affectedFamilies: needsPatch.length,
      };
    }
    case "verifyOrder": {
      const tracks = await findTrack(ctx, edit.programPhase, edit.trackTitle);
      if (tracks.length === 0) {
        return { edit: edit.id, status: "skipped", reason: "track_not_found" };
      }
      const mismatches: string[] = [];
      for (const t of tracks) {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_track", (q) => q.eq("track_id", t._id))
          .collect();
        const live = lessons
          .filter((l) => !l.deleted_at)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const actualPrefix = live.slice(0, edit.expectedOrder.length).map((l) => l.title);
        const matches = edit.expectedOrder.every((t, i) => actualPrefix[i] === t);
        if (!matches) {
          mismatches.push(`family:${t.family_id} actual=[${actualPrefix.join(",")}]`);
        }
      }
      if (mismatches.length === 0) {
        return { edit: edit.id, status: "applied", reason: "order_correct" };
      }
      return {
        edit: edit.id,
        status: "failed",
        reason: `order_mismatch:${mismatches.join(";")}`,
      };
    }
    case "priority": {
      const titleMatch =
        edit.target.title === "Charitable Structures" ? "prefix" : "exact";
      const found = await findLessonsByTitleAndPhase(
        ctx,
        edit.target.title,
        edit.target.phase,
        { titleMatch },
      );
      // Item 5.5.3: schema now carries `lessons.priority`. Patch each match
      // whose current priority differs from the target. Idempotency: if every
      // match already has the target priority, return `skipped: already_set`.
      const target = edit.newPriority.toLowerCase() as
        | "core"
        | "extended"
        | "exploratory";
      if (found.length === 0) {
        return { edit: edit.id, status: "skipped", reason: "lesson_not_found" };
      }
      const needsPatch = found.filter((l) => (l.priority ?? "core") !== target);
      if (needsPatch.length === 0) {
        return {
          edit: edit.id,
          status: "skipped",
          reason: "already_set",
          affectedLessonIds: found.map((l) => l._id),
          affectedFamilies: found.length,
        };
      }
      if (dryRun) {
        return {
          edit: edit.id,
          status: "applied",
          affectedLessonIds: needsPatch.map((l) => l._id),
          affectedFamilies: needsPatch.length,
        };
      }
      for (const l of needsPatch) {
        await ctx.db.patch(l._id, { priority: target });
        await writeAudit(ctx, {
          familyId: l.family_id,
          actorKind: "system",
          category: "mutation",
          action: AUDIT_ACTION,
          resourceType: "lessons",
          resourceId: l._id,
          metadata: {
            edit: edit.id,
            kind: "priority",
            title: l.title,
            from: l.priority ?? "core",
            to: target,
          },
        });
      }
      return {
        edit: edit.id,
        status: "applied",
        affectedLessonIds: needsPatch.map((l) => l._id),
        affectedFamilies: needsPatch.length,
      };
    }
    case "flag": {
      const found = await findLessonsByTitleAndPhase(
        ctx,
        edit.target.title,
        edit.target.phase,
      );
      if (!dryRun) {
        for (const l of found) {
          await writeAudit(ctx, {
            familyId: l.family_id,
            actorKind: "system",
            category: "mutation",
            action: AUDIT_ACTION,
            resourceType: "lessons",
            resourceId: l._id,
            metadata: {
              edit: edit.id,
              kind: "flag",
              title: l.title,
              reason: edit.reason,
            },
          });
        }
      }
      return {
        edit: edit.id,
        status: "skipped",
        reason: `flagged:${edit.reason}`,
        affectedLessonIds: found.map((l) => l._id),
        affectedFamilies: found.length,
      };
    }
  }
}

export const applyCurriculumEdits2026_04 = internalMutation({
  args: {
    confirmIntent: v.optional(v.boolean()),
  },
  handler: async (ctx, { confirmIntent }) => {
    // Pass 1 — dry run to count what would change.
    const dryResults: EditResult[] = [];
    for (const edit of EDITS) {
      dryResults.push(await applyEdit(ctx, edit, /* dryRun */ true));
    }
    const wouldTouch = dryResults.filter((r) => r.status === "applied").length;

    // Guard: if anything would change, require explicit confirmIntent.
    if (!confirmIntent && wouldTouch > 0) {
      return {
        status: "dry_run" as const,
        message:
          "Pass confirmIntent: true to actually apply. This is a Brad-blocked migration.",
        wouldTouch,
        summary: dryResults,
        totalApplied: 0,
        totalSkipped: dryResults.filter((r) => r.status === "skipped").length,
        totalFailed: dryResults.filter((r) => r.status === "failed").length,
      };
    }

    // Pass 2 — actually write. Re-evaluate each edit (idempotency holds).
    const summary: EditResult[] = [];
    for (const edit of EDITS) {
      summary.push(await applyEdit(ctx, edit, /* dryRun */ false));
    }
    return {
      status: "applied" as const,
      summary,
      totalApplied: summary.filter((r) => r.status === "applied").length,
      totalSkipped: summary.filter((r) => r.status === "skipped").length,
      totalFailed: summary.filter((r) => r.status === "failed").length,
    };
  },
});
