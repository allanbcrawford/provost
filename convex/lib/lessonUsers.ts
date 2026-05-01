// Shared lesson_users helpers. Currently exposes `touchLessonUser`, called
// from every member-driven write path on a lesson_users row so the
// denormalized `last_touched_at` stays in sync. The Issue 3.3 stale-detection
// rollup (`memberLessonRollup`) uses this column directly instead of
// approximating from `_creationTime` + quiz timestamps.
//
// Existing rows predate the column; readers fall back to `_creationTime`
// when `last_touched_at` is null. No backfill migration is needed — the value
// becomes accurate the next time the user touches the row.
//
// IMPORTANT: do NOT call this from advisor/admin override paths
// (`setLessonStatusForMember`) — the *user* did not touch the lesson, the
// steward did. Bumping there would mask genuine staleness.

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function touchLessonUser(
  ctx: MutationCtx,
  lessonUserId: Id<"lesson_users">,
  at: number = Date.now(),
): Promise<void> {
  await ctx.db.patch(lessonUserId, { last_touched_at: at });
}
