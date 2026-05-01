// Shared thread helpers. Currently exposes `touchThread`, called from every
// site that appends messages to a thread so the denormalized
// `last_message_at` stays in sync. Reads (e.g. `recentThreads`) sort by this
// field so resuming an old thread bubbles it to the top.
//
// Existing threads predate the column; readers fall back to `_creationTime`
// when `last_message_at` is null. No backfill migration is needed — the value
// becomes accurate the next time a message is appended.

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function touchThread(
  ctx: MutationCtx,
  threadId: Id<"threads">,
  at: number = Date.now(),
): Promise<void> {
  await ctx.db.patch(threadId, { last_message_at: at });
}
