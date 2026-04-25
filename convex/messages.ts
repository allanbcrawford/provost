import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { grantParty } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember, requireUserRecord } from "./lib/authz";

// Verify the caller is in the thread's participant set. Admin bypass does
// NOT apply (per ACL policy: message resource type has BYPASS_BY_TYPE = false).
async function assertThreadParticipant(
  _ctx: QueryCtx | MutationCtx,
  thread: Doc<"message_threads">,
  userId: Id<"users">,
): Promise<void> {
  if (!thread.participant_user_ids.includes(userId)) {
    throw new ConvexError({ code: "MESSAGE_FORBIDDEN", threadId: thread._id });
  }
}

export const listInbox = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const threads = await ctx.db
      .query("message_threads")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const mine = threads
      .filter((t) => !t.deleted_at && t.participant_user_ids.includes(user._id))
      .sort((a, b) => b.last_message_at - a.last_message_at);

    return await Promise.all(
      mine.map(async (t) => {
        const last = await ctx.db
          .query("messages")
          .withIndex("by_thread_and_sent_at", (q) => q.eq("thread_id", t._id))
          .order("desc")
          .take(1);
        const lastMessage = last[0] ?? null;

        // Unread = messages in this thread not authored by me without a read row.
        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("thread_id", t._id))
          .collect();
        const otherMessages = allMessages.filter(
          (m) => m.sender_user_id !== user._id && !m.deleted_at,
        );
        let unread = 0;
        for (const m of otherMessages) {
          const read = await ctx.db
            .query("message_reads")
            .withIndex("by_user_and_message", (q) =>
              q.eq("user_id", user._id).eq("message_id", m._id),
            )
            .unique();
          if (!read) unread++;
        }

        const otherIds = t.participant_user_ids.filter((id) => id !== user._id);
        const others = await Promise.all(otherIds.map((id) => ctx.db.get(id)));
        const otherNames = others
          .filter((u): u is Doc<"users"> => u !== null)
          .map((u) => [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email);

        return {
          _id: t._id,
          subject: t.subject ?? "(no subject)",
          participantNames: otherNames,
          lastBody: lastMessage?.body ?? "",
          lastSentAt: t.last_message_at,
          unread,
        };
      }),
    );
  },
});

export const listSent = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const all = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q) // pagination over time would be ideal; for v1 we collect.
      .collect();
    const sent = all.filter(
      (m) => m.family_id === familyId && m.sender_user_id === user._id && !m.deleted_at,
    );
    sent.sort((a, b) => b.sent_at - a.sent_at);
    return await Promise.all(
      sent.slice(0, 100).map(async (m) => {
        const t = await ctx.db.get(m.thread_id);
        return {
          _id: m._id,
          thread_id: m.thread_id,
          subject: t?.subject ?? "(no subject)",
          body: m.body,
          sent_at: m.sent_at,
        };
      }),
    );
  },
});

export const getThread = query({
  args: { threadId: v.id("message_threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadParticipant(ctx, thread, user._id);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_sent_at", (q) => q.eq("thread_id", threadId))
      .collect();
    const live = messages.filter((m) => !m.deleted_at);
    live.sort((a, b) => a.sent_at - b.sent_at);

    const senderIds = Array.from(new Set(live.map((m) => m.sender_user_id)));
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)));
    const senderMap = new Map(
      senders
        .filter((u): u is Doc<"users"> => u !== null)
        .map(
          (u) =>
            [
              u._id,
              [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email,
            ] as const,
        ),
    );

    return {
      _id: thread._id,
      subject: thread.subject ?? "",
      participantIds: thread.participant_user_ids,
      messages: live.map((m) => ({
        _id: m._id,
        sender_user_id: m.sender_user_id,
        senderName: senderMap.get(m.sender_user_id) ?? "Unknown",
        body: m.body,
        sent_at: m.sent_at,
      })),
    };
  },
});

export const sendMessage = mutation({
  args: {
    familyId: v.id("families"),
    threadId: v.optional(v.id("message_threads")),
    recipientUserIds: v.optional(v.array(v.id("users"))),
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.body.trim().length === 0) {
      throw new ConvexError({ code: "EMPTY_BODY" });
    }
    const { user } = await requireFamilyMember(ctx, args.familyId);

    let thread: Doc<"message_threads">;
    if (args.threadId) {
      const t = await ctx.db.get(args.threadId);
      if (!t || t.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
      await assertThreadParticipant(ctx, t, user._id);
      thread = t;
    } else {
      const recipientIds = args.recipientUserIds ?? [];
      if (recipientIds.length === 0) {
        throw new ConvexError({ code: "NO_RECIPIENTS" });
      }
      // All recipients must be in the same family as the sender. (No cross-
      // family DMs in v1; professionals are family-scoped after Stage 6.)
      for (const rid of recipientIds) {
        const m = await ctx.db
          .query("family_users")
          .withIndex("by_family_and_user", (q) =>
            q.eq("family_id", args.familyId).eq("user_id", rid),
          )
          .unique();
        if (!m) throw new ConvexError({ code: "RECIPIENT_NOT_IN_FAMILY", userId: rid });
      }
      const participants = Array.from(new Set([user._id, ...recipientIds]));
      const threadId: Id<"message_threads"> = await ctx.db.insert("message_threads", {
        family_id: args.familyId,
        subject: args.subject,
        participant_user_ids: participants,
        last_message_at: Date.now(),
      });
      const fetched = await ctx.db.get(threadId);
      if (!fetched) throw new Error("failed to load just-created thread");
      thread = fetched;
    }

    const messageId: Id<"messages"> = await ctx.db.insert("messages", {
      thread_id: thread._id,
      family_id: args.familyId,
      sender_user_id: user._id,
      body: args.body,
      sent_at: Date.now(),
    });
    await ctx.db.patch(thread._id, { last_message_at: Date.now() });

    // Grant party rows so that even if the bypass policy ever changed,
    // visibility stays scoped to the conversation participants.
    for (const pid of thread.participant_user_ids) {
      await grantParty(ctx, {
        familyId: args.familyId,
        resourceType: "message",
        resourceId: messageId,
        userId: pid,
        role: pid === user._id ? "owner" : "party",
        grantedBy: user._id,
      });
    }

    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "messages.send",
      resourceType: "messages",
      resourceId: messageId,
      metadata: { threadId: thread._id, recipients: thread.participant_user_ids.length - 1 },
    });

    return { messageId, threadId: thread._id };
  },
});

export const markThreadRead = mutation({
  args: { threadId: v.id("message_threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.deleted_at) return null;
    const { user } = await requireFamilyMember(ctx, thread.family_id);
    await assertThreadParticipant(ctx, thread, user._id);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("thread_id", threadId))
      .collect();
    const now = Date.now();
    let marked = 0;
    for (const m of messages) {
      if (m.sender_user_id === user._id) continue;
      if (m.deleted_at) continue;
      const existing = await ctx.db
        .query("message_reads")
        .withIndex("by_user_and_message", (q) => q.eq("user_id", user._id).eq("message_id", m._id))
        .unique();
      if (existing) continue;
      await ctx.db.insert("message_reads", {
        message_id: m._id,
        user_id: user._id,
        read_at: now,
      });
      marked++;
    }
    return { marked };
  },
});

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const drafts = await ctx.db
      .query("message_drafts")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    drafts.sort((a, b) => b.updated_at - a.updated_at);
    return drafts.map((d) => ({
      _id: d._id,
      thread_id: d.thread_id ?? null,
      recipient_user_ids: d.recipient_user_ids,
      body: d.body,
      updated_at: d.updated_at,
    }));
  },
});

// Returns the set of users in the caller's family that are valid DM
// recipients. We split family_users into "members" (role = admin/member) and
// "professionals" (role = advisor/trustee) so the recipient picker can render
// role badges. The caller is excluded.
//
// Professionals in v1 are family-scoped via the family_users.role union; the
// `professionals` table is a separate directory of external contacts and does
// NOT have user rows, so it is intentionally not included here (sendMessage
// requires Id<"users"> recipients with a family_users membership).
export const listMessageableContacts = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { user } = await requireFamilyMember(ctx, familyId);
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();

    const users: Array<{
      _id: Id<"users">;
      name: string;
      email: string;
      role: "admin" | "member" | "advisor" | "trustee";
      employment_role: string | null;
    }> = [];
    const professionals: Array<{
      _id: Id<"users">;
      name: string;
      email: string;
      role: "advisor" | "trustee";
      employment_role: string | null;
    }> = [];

    for (const m of memberships) {
      if (m.user_id === user._id) continue;
      const u = await ctx.db.get(m.user_id);
      if (!u || u.deleted_at) continue;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
      const employment_role = m.employment_role ?? null;
      if (m.role === "admin" || m.role === "member") {
        users.push({
          _id: u._id,
          name,
          email: u.email,
          role: m.role,
          employment_role,
        });
      } else {
        professionals.push({
          _id: u._id,
          name,
          email: u.email,
          role: m.role,
          employment_role,
        });
      }
    }

    users.sort((a, b) => a.name.localeCompare(b.name));
    professionals.sort((a, b) => a.name.localeCompare(b.name));
    return { users, professionals };
  },
});

export const saveDraft = mutation({
  args: {
    familyId: v.id("families"),
    threadId: v.optional(v.id("message_threads")),
    recipientUserIds: v.array(v.id("users")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFamilyMember(ctx, args.familyId);
    // One draft per (user, thread). If thread is undefined we use the new-DM
    // bucket (still one draft for "new message"); replace its body.
    const existing = await ctx.db
      .query("message_drafts")
      .withIndex("by_user_and_thread", (q) =>
        q.eq("user_id", user._id).eq("thread_id", args.threadId),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        body: args.body,
        recipient_user_ids: args.recipientUserIds,
        updated_at: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("message_drafts", {
      user_id: user._id,
      family_id: args.familyId,
      thread_id: args.threadId,
      recipient_user_ids: args.recipientUserIds,
      body: args.body,
      updated_at: Date.now(),
    });
  },
});
