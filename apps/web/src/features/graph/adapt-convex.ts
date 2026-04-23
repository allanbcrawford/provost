import type { Doc } from "../../../../../convex/_generated/dataModel";
import type { Document, Member, Professional } from "./types";

type ConvexUser = Doc<"users">;
type ConvexDocument = Doc<"documents">;
type ConvexProfessional = Doc<"professionals">;

export function adaptMember(u: ConvexUser): Member {
  return {
    id: u._id,
    first_name: u.first_name,
    middle_name: u.middle_name ?? null,
    last_name: u.last_name,
    email_address: u.email,
    phone_number: u.phone_number ?? "",
    date_of_birth: u.date_of_birth ?? "",
    home_location: u.home_location ?? "",
    education: u.education ?? "",
    role: u.role,
    generation: u.generation,
    father_id: u.father_id ?? null,
    mother_id: u.mother_id ?? null,
    spouse_id: u.spouse_id ?? null,
    learning_path: u.learning_path ?? null,
    onboarding_status: u.onboarding_status,
    created_at: u._creationTime / 1000,
  };
}

export function adaptDocument(d: ConvexDocument): Document {
  return {
    id: d._id,
    created_at: d._creationTime / 1000,
    updated_at: null,
    family_id: d.family_id,
    name: d.name,
    description: d.description ?? "",
    summary: d.summary ?? "",
    category: d.category,
    type: d.type,
    file_name: d.name,
    creator_name: d.creator_name ?? "",
    observation: {
      type: d.observation_type,
      is_observed: d.observation_is_observed,
    },
  };
}

export function adaptProfessional(p: ConvexProfessional): Professional {
  return {
    id: p._id,
    name: p.name,
    profession: p.profession,
    firm: p.firm,
    email: p.email,
  };
}

export function adaptGraphPayload(input: {
  members: ConvexUser[];
  documents: ConvexDocument[];
  professionals: ConvexProfessional[];
}): {
  members: Member[];
  documents: Document[];
  professionals: Professional[];
} {
  return {
    members: input.members.map(adaptMember),
    documents: input.documents.map(adaptDocument),
    professionals: input.professionals.map(adaptProfessional),
  };
}
