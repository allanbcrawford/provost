import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { filterByAccess, grantParty, requireResourceWrite } from "./lib/acl";
import { writeAudit } from "./lib/audit";
import { requireFamilyMember } from "./lib/authz";

const locationType = v.union(v.literal("in_person"), v.literal("video"));
const rsvpStatus = v.union(
  v.literal("pending"),
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
);

// List upcoming and past events. We always return both buckets so a single
// query feeds both Calendar and List views.
export const list = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const { membership } = await requireFamilyMember(ctx, familyId);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const live = rows.filter((e) => !e.deleted_at);
    const scoped = await filterByAccess(ctx, "event", live, membership);
    scoped.sort((a, b) => a.starts_at - b.starts_at);

    // Hydrate attendee counts. Cheap because we already have ids loaded.
    const out = [];
    for (const e of scoped) {
      const attendees = await ctx.db
        .query("event_attendees")
        .withIndex("by_event", (q) => q.eq("event_id", e._id))
        .collect();
      out.push({
        _id: e._id,
        title: e.title,
        description: e.description ?? "",
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        location_type: e.location_type,
        location_detail: e.location_detail ?? null,
        attendeeCount: attendees.length,
      });
    }
    return out;
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, event.family_id);

    const attendees = await ctx.db
      .query("event_attendees")
      .withIndex("by_event", (q) => q.eq("event_id", eventId))
      .collect();

    const userIds = attendees.map((a) => a.user_id);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
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
      _id: event._id,
      title: event.title,
      description: event.description ?? "",
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      location_type: event.location_type,
      location_detail: event.location_detail ?? null,
      agenda: event.agenda ?? null,
      recap: event.recap ?? null,
      created_by: event.created_by,
      myRsvp: attendees.find((a) => a.user_id === user._id)?.rsvp_status ?? null,
      attendees: attendees.map((a) => ({
        _id: a._id,
        user_id: a.user_id,
        name: userMap.get(a.user_id) ?? "Unknown",
        rsvp_status: a.rsvp_status,
      })),
    };
  },
});

// List people you can invite to an event from this family: every active
// family_users row's user, plus every per-family professional. Professionals
// are returned as a separate bucket because they are not yet `users` rows;
// the form treats them as informational (only `users` ids are submitted to
// `events.create`). Returned shape is intentionally tiny — the picker only
// needs id, display name, and role context.
export const listEventableContacts = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    await requireFamilyMember(ctx, familyId);
    const memberships = await ctx.db
      .query("family_users")
      .withIndex("by_family", (q) => q.eq("family_id", familyId))
      .collect();
    const userDocs = await Promise.all(memberships.map((m) => ctx.db.get(m.user_id)));
    const users = memberships
      .map((m, i) => {
        const u = userDocs[i] as Doc<"users"> | null;
        if (!u || u.deleted_at) return null;
        const name =
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email || "Unknown";
        return { user_id: u._id, name, email: u.email, family_role: m.role };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const professionals = (
      await ctx.db
        .query("professionals")
        .withIndex("by_family", (q) => q.eq("family_id", familyId))
        .collect()
    ).map((p) => ({
      professional_id: p._id,
      name: p.name,
      profession: p.profession,
      email: p.email,
    }));

    return { users, professionals };
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    locationType,
    locationDetail: v.optional(v.string()),
    agenda: v.optional(v.string()),
    attendeeUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.endsAt < args.startsAt) {
      throw new ConvexError({ code: "INVALID_RANGE" });
    }
    const { user } = await requireFamilyMember(ctx, args.familyId);

    // Validate every attendee is in the family.
    for (const uid of args.attendeeUserIds) {
      const m = await ctx.db
        .query("family_users")
        .withIndex("by_family_and_user", (q) => q.eq("family_id", args.familyId).eq("user_id", uid))
        .unique();
      if (!m) throw new ConvexError({ code: "ATTENDEE_NOT_IN_FAMILY", userId: uid });
    }

    const eventId: Id<"events"> = await ctx.db.insert("events", {
      family_id: args.familyId,
      created_by: user._id,
      title: args.title,
      description: args.description,
      starts_at: args.startsAt,
      ends_at: args.endsAt,
      location_type: args.locationType,
      location_detail: args.locationDetail,
      agenda: args.agenda,
    });

    // Owner = creator. Each attendee gets a `party` row + a pending RSVP.
    await grantParty(ctx, {
      familyId: args.familyId,
      resourceType: "event",
      resourceId: eventId,
      userId: user._id,
      role: "owner",
      grantedBy: user._id,
    });
    const allAttendeeIds = Array.from(new Set([user._id, ...args.attendeeUserIds]));
    for (const aid of allAttendeeIds) {
      await ctx.db.insert("event_attendees", {
        event_id: eventId,
        user_id: aid,
        rsvp_status: aid === user._id ? "yes" : "pending",
      });
      if (aid !== user._id) {
        await grantParty(ctx, {
          familyId: args.familyId,
          resourceType: "event",
          resourceId: eventId,
          userId: aid,
          role: "party",
          grantedBy: user._id,
        });
      }
    }

    await writeAudit(ctx, {
      familyId: args.familyId,
      actorUserId: user._id,
      actorKind: "user",
      category: "mutation",
      action: "events.create",
      resourceType: "events",
      resourceId: eventId,
      metadata: { title: args.title, attendeeCount: allAttendeeIds.length },
    });
    return eventId;
  },
});

export const rsvp = mutation({
  args: { eventId: v.id("events"), status: rsvpStatus },
  handler: async (ctx, { eventId, status }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    const { user } = await requireFamilyMember(ctx, event.family_id);

    const existing = await ctx.db
      .query("event_attendees")
      .withIndex("by_event_and_user", (q) => q.eq("event_id", eventId).eq("user_id", user._id))
      .unique();
    if (!existing) {
      throw new ConvexError({ code: "NOT_INVITED" });
    }
    await ctx.db.patch(existing._id, { rsvp_status: status });
    return null;
  },
});

export const setRecap = mutation({
  args: { eventId: v.id("events"), recap: v.string() },
  handler: async (ctx, { eventId, recap }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.deleted_at) throw new ConvexError({ code: "NOT_FOUND" });
    await requireResourceWrite(ctx, "event", event, eventId);
    await ctx.db.patch(eventId, { recap });
    return null;
  },
});
