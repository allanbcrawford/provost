import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation } from "./_generated/server";
import documentsData from "./seed_data/documents.json";
import familyData from "./seed_data/family.json";
import lessonsData from "./seed_data/lessons.json";
import libraryData from "./seed_data/library.json";
import professionalsData from "./seed_data/professionals.json";

const DEMO_FAMILY_NAME = "Williams Family (demo)";

type FamilyMember = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email_address?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  home_location?: string | null;
  education?: string | null;
  role?: string | null;
  generation: number;
  father_id?: string | null;
  mother_id?: string | null;
  spouse_id?: string | null;
  learning_path?: string | null;
  onboarding_status?: string | null;
};

type DocumentRecord = {
  id: string;
  name: string;
  description?: string | null;
  summary?: string | null;
  category: string;
  type: string;
  creator_name?: string | null;
  observation?: { type?: string | null; is_observed?: boolean | null } | null;
};

type LibraryRecord = {
  id: string;
  title: string;
  author?: string | null;
  category?: string | null;
  content?: string | null;
  tags?: unknown;
};

type LessonRecord = {
  id: string;
  title?: string | null;
  shortTitle?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  content?: unknown;
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("name"), DEMO_FAMILY_NAME))
      .first();
    if (existing) {
      return { status: "already_seeded" as const, familyId: existing._id };
    }

    const members = familyData as FamilyMember[];
    const srcIdToId = new Map<string, Id<"users">>();

    for (const m of members) {
      const role: "admin" | "member" = m.role === "admin" ? "admin" : "member";
      const email =
        m.email_address ?? `${m.first_name.toLowerCase()}.${m.last_name.toLowerCase()}@example.com`;
      const id = await ctx.db.insert("users", {
        first_name: m.first_name,
        last_name: m.last_name,
        middle_name: m.middle_name ?? undefined,
        email,
        phone_number: m.phone_number ?? undefined,
        date_of_birth: m.date_of_birth ?? undefined,
        home_location: m.home_location ?? undefined,
        education: m.education ?? undefined,
        role,
        generation: m.generation,
        clerk_user_id: `seed-${m.id}`,
        learning_path: m.learning_path ?? undefined,
        onboarding_status: m.onboarding_status ?? "pending",
      });
      srcIdToId.set(m.id, id);
    }

    for (const m of members) {
      const patch: {
        father_id?: Id<"users">;
        mother_id?: Id<"users">;
        spouse_id?: Id<"users">;
      } = {};
      const self = srcIdToId.get(m.id);
      if (!self) continue;
      if (m.father_id && srcIdToId.has(m.father_id)) {
        patch.father_id = srcIdToId.get(m.father_id)!;
      }
      if (m.mother_id && srcIdToId.has(m.mother_id)) {
        patch.mother_id = srcIdToId.get(m.mother_id)!;
      }
      if (m.spouse_id && srcIdToId.has(m.spouse_id)) {
        patch.spouse_id = srcIdToId.get(m.spouse_id)!;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(self, patch);
      }
    }

    const firstMember = members[0];
    if (!firstMember) {
      throw new Error("family.json is empty — cannot seed a family without members");
    }
    const firstUser = srcIdToId.get(firstMember.id)!;
    const familyId = await ctx.db.insert("families", {
      name: DEMO_FAMILY_NAME,
      description: "Seeded demo family for local development.",
      created_by: firstUser,
    });

    for (let i = 0; i < members.length; i++) {
      const m = members[i]!;
      const userId = srcIdToId.get(m.id)!;
      await ctx.db.insert("family_users", {
        family_id: familyId,
        user_id: userId,
        role: i === 0 ? "admin" : "member",
      });
    }

    let documentCount = 0;
    for (const d of documentsData as DocumentRecord[]) {
      const obsType: "observation" | "danger" =
        d.observation?.type === "danger" ? "danger" : "observation";
      await ctx.db.insert("documents", {
        family_id: familyId,
        name: d.name,
        description: d.description ?? undefined,
        summary: d.summary ?? undefined,
        category: d.category,
        type: d.type,
        creator_name: d.creator_name ?? undefined,
        observation_type: obsType,
        observation_is_observed: d.observation?.is_observed ?? false,
      });
      documentCount++;
    }

    let professionalCount = 0;
    for (const p of professionalsData as Array<{
      name: string;
      profession: string;
      firm: string;
      email: string;
    }>) {
      await ctx.db.insert("professionals", {
        name: p.name,
        profession: p.profession,
        firm: p.firm,
        email: p.email,
      });
      professionalCount++;
    }

    const librarySources: LibraryRecord[] = Array.isArray(libraryData)
      ? (libraryData as LibraryRecord[])
      : ((libraryData as { documents?: LibraryRecord[] }).documents ?? []);
    let librarySourceCount = 0;
    for (const src of librarySources) {
      await ctx.db.insert("library_sources", {
        family_id: familyId,
        title: src.title,
        author: src.author ?? undefined,
        category: src.category ?? "general",
        content: src.content ?? "",
        tags: src.tags ?? {},
      });
      librarySourceCount++;
    }

    let lessonCount = 0;
    for (const l of lessonsData as LessonRecord[]) {
      const title = l.title ?? l.shortTitle ?? "Untitled Lesson";
      const description = l.description ?? l.shortDescription ?? "";
      await ctx.db.insert("lessons", {
        family_id: familyId,
        title,
        description,
        category: l.category ?? "financial_literacy",
        content: l.content ?? {},
      });
      lessonCount++;
    }

    return {
      status: "seeded" as const,
      familyId,
      users: srcIdToId.size,
      documents: documentCount,
      professionals: professionalCount,
      librarySources: librarySourceCount,
      lessons: lessonCount,
    };
  },
});

export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    if (process.env.ALLOW_SEED !== "true") {
      throw new Error("ALLOW_SEED not set; seed disabled");
    }
    return await ctx.runMutation(internal.seed.run, {});
  },
});
