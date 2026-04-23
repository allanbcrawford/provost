import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type AuditCategory = "mutation" | "tool_call" | "run" | "auth" | "approval";

export type AuditEntry = {
  familyId?: Id<"families">;
  actorUserId?: Id<"users">;
  actorKind: "user" | "system" | "agent";
  category: AuditCategory;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(ctx: MutationCtx, entry: AuditEntry) {
  await ctx.db.insert("audit_events", {
    family_id: entry.familyId,
    actor_user_id: entry.actorUserId,
    actor_kind: entry.actorKind,
    category: entry.category,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    metadata: entry.metadata ?? {},
  });
}

export function withAudit<TArgs, TResult>(
  handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>,
  buildEntry: (args: TArgs, result: TResult) => AuditEntry,
): (ctx: MutationCtx, args: TArgs) => Promise<TResult> {
  return async (ctx, args) => {
    const result = await handler(ctx, args);
    await writeAudit(ctx, buildEntry(args, result));
    return result;
  };
}
