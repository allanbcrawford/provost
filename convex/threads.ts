import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";
import { touchThread } from "./lib/threads";

async function assertThreadAccess(
  ctx: QueryCtx | MutationCtx,
  thread: Doc<"threads">,
  userId: Id<"users">,
) {
  if (thread.creator_id === userId) return;
  const shared = await ctx.db
    .query("thread_users")
    .withIndex("by_thread_and_user", (q) => q.eq("thread_id", thread._id).eq("user_id", userId))
    .unique();
  if (!shared) throw new ConvexError({ code: "THREAD_FORBIDDEN", threadId: thread._id });
}

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) return null;
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadAccess(ctx, thread, user._id);
    return thread;
  },
});

export const list = query({
  args: {
    familyId: v.id("families"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { familyId, includeDeleted }) => {
    const { user } = await requireFamilyMember(ctx, familyId);

    const familyThreads = await ctx.db
      .query("threads")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();

    const sharedRows = await ctx.db
      .query("thread_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const sharedThreadIds = new Set(sharedRows.map((r) => r.thread_id));

    const visible = familyThreads.filter((t) => {
      if (!includeDeleted && t.deleted_at) return false;
      return t.creator_id === user._id || sharedThreadIds.has(t._id);
    });

    visible.sort((a, b) => b._creationTime - a._creationTime);
    return visible;
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    title: v.optional(v.string()),
    // Phase 4 Issue 4.1 — defaults to side_rail when omitted
    kind: v.optional(v.union(v.literal("side_rail"), v.literal("full_screen"))),
  },
  handler: async (ctx, { familyId, title, kind }) => {
    const { user } = await requireFamilyMember(ctx, familyId);

    const threadId = await ctx.db.insert("threads", {
      family_id: familyId,
      creator_id: user._id,
      title,
      messages: [],
      kind: kind ?? "side_rail",
    });
    await ctx.db.insert("thread_users", {
      thread_id: threadId,
      user_id: user._id,
    });

    await writeAudit(ctx, {
      familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.create",
      resourceType: "threads",
      resourceId: threadId,
      metadata: { title: title ?? null },
    });

    return { threadId };
  },
});

export const rename = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadAccess(ctx, thread, user._id);

    await ctx.db.patch(threadId, { title });

    await writeAudit(ctx, {
      familyId: thread.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.rename",
      resourceType: "threads",
      resourceId: threadId,
      metadata: { title },
    });

    return { ok: true };
  },
});

export const softDelete = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user, membership } = await requireFamilyMember(ctx, thread.family_id);
    // Only creator or family admin can delete.
    if (thread.creator_id !== user._id && membership.role !== "admin") {
      throw new ConvexError({ code: "THREAD_DELETE_FORBIDDEN" });
    }

    await ctx.db.patch(threadId, { deleted_at: Date.now() });

    await writeAudit(ctx, {
      familyId: thread.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.soft_delete",
      resourceType: "threads",
      resourceId: threadId,
    });

    return { ok: true };
  },
});

export const share = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user, membership } = await requireFamilyMember(ctx, thread.family_id);
    if (thread.creator_id !== user._id && membership.role !== "admin") {
      throw new ConvexError({ code: "THREAD_SHARE_FORBIDDEN" });
    }

    // Target must be a family member too.
    const targetMembership = await ctx.db
      .query("family_users")
      .withIndex("by_family_and_user", (q) =>
        q.eq("family_id", thread.family_id).eq("user_id", userId),
      )
      .unique();
    if (!targetMembership) throw new ConvexError({ code: "TARGET_NOT_FAMILY_MEMBER" });

    const existing = await ctx.db
      .query("thread_users")
      .withIndex("by_thread_and_user", (q) => q.eq("thread_id", threadId).eq("user_id", userId))
      .unique();
    if (!existing) {
      await ctx.db.insert("thread_users", { thread_id: threadId, user_id: userId });
    }

    await writeAudit(ctx, {
      familyId: thread.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.share",
      resourceType: "threads",
      resourceId: threadId,
      metadata: { sharedWith: userId },
    });

    return { ok: true };
  },
});

export const unshare = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user, membership } = await requireFamilyMember(ctx, thread.family_id);
    if (thread.creator_id !== user._id && membership.role !== "admin") {
      throw new ConvexError({ code: "THREAD_UNSHARE_FORBIDDEN" });
    }
    // Can't unshare the creator.
    if (thread.creator_id === userId) {
      throw new ConvexError({ code: "CANNOT_UNSHARE_CREATOR" });
    }

    const existing = await ctx.db
      .query("thread_users")
      .withIndex("by_thread_and_user", (q) => q.eq("thread_id", threadId).eq("user_id", userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);

    await writeAudit(ctx, {
      familyId: thread.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.unshare",
      resourceType: "threads",
      resourceId: threadId,
      metadata: { unsharedFrom: userId },
    });

    return { ok: true };
  },
});

const threadMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool"), v.literal("system")),
  content: v.string(),
  name: v.optional(v.string()),
  tool_call_id: v.optional(v.string()),
});

export const addMessages = mutation({
  args: {
    threadId: v.id("threads"),
    messages: v.array(threadMessageValidator),
  },
  handler: async (ctx, { threadId, messages }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError({ code: "THREAD_NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadAccess(ctx, thread, user._id);

    const next = [...(thread.messages ?? []), ...messages];
    await ctx.db.patch(threadId, { messages: next });
    // Phase 4 follow-up — bump last_message_at so recentThreads sorts by recency.
    await touchThread(ctx, threadId);

    await writeAudit(ctx, {
      familyId: thread.family_id,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "thread.add_messages",
      resourceType: "threads",
      resourceId: threadId,
      metadata: { count: messages.length },
    });

    return { ok: true, count: next.length };
  },
});

// Phase 4 Issue 4.4 — surfaces recent threads in left-nav "Chat history".
// Sorted by last_message_at desc with _creationTime fallback so resumed
// threads bubble. Title precedence: thread.title → thread.summary
// (truncated 60) → first user message (truncated 60) → "New conversation".
export const recentThreads = query({
  args: {
    familyId: v.id("families"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { familyId, limit }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const cap = Math.min(Math.max(limit ?? 10, 1), 25);

    const ownThreads = await ctx.db
      .query("threads")
      .withIndex("by_creator", (q) => q.eq("creator_id", user._id))
      .collect();
    const sharedThreadUsers = await ctx.db
      .query("thread_users")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    const sharedThreadIds = new Set(sharedThreadUsers.map((tu) => tu.thread_id));
    const sharedThreads = await Promise.all(
      [...sharedThreadIds].map((id) => ctx.db.get(id)),
    );

    const seen = new Set<string>();
    const merged: Doc<"threads">[] = [];
    for (const t of [...ownThreads, ...sharedThreads]) {
      if (!t) continue;
      if (t.deleted_at) continue;
      if (t.family_id !== familyId) continue;
      if (seen.has(String(t._id))) continue;
      seen.add(String(t._id));
      merged.push(t);
    }

    merged.sort((a, b) => {
      const aTime = a.last_message_at ?? a._creationTime;
      const bTime = b.last_message_at ?? b._creationTime;
      return bTime - aTime;
    });

    const top = merged.slice(0, cap);
    return top.map((t) => {
      const userMsg = (t.messages ?? []).find(
        (m: { role?: string; content?: string }) =>
          m?.role === "user" && typeof m.content === "string",
      ) as { content?: string } | undefined;
      const fallbackTitle =
        userMsg?.content?.slice(0, 60) ?? t.summary?.slice(0, 60) ?? "New conversation";
      const lastAssistant = [...(t.messages ?? [])]
        .reverse()
        .find(
          (m: { role?: string; content?: string }) =>
            m?.role === "assistant" && typeof m.content === "string",
        ) as { content?: string } | undefined;
      const preview = lastAssistant?.content?.slice(0, 80) ?? "";
      return {
        id: t._id,
        title: t.title || fallbackTitle,
        preview,
        updatedAt: t.last_message_at ?? t._creationTime,
        kind: t.kind ?? null,
      };
    });
  },
});
