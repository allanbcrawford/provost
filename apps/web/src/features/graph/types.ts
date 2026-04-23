export type Member = {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email_address: string;
  phone_number: string;
  date_of_birth: string;
  home_location: string;
  education: string;
  role: "admin" | "member";
  generation: number;
  father_id: string | null;
  mother_id: string | null;
  spouse_id: string | null;
  learning_path: string | null;
  onboarding_status: string;
  created_at: number;
};

export type DocObservation = { type: "observation" | "danger"; is_observed: boolean };

export type Document = {
  id: string;
  created_at: number;
  updated_at: number | null;
  family_id: string;
  name: string;
  description: string;
  summary: string;
  category: "estate_plan" | "financial_statements" | string;
  type: string;
  file_name: string;
  creator_name: string;
  observation: DocObservation;
};

export type Professional = {
  id: string;
  name: string;
  profession: string;
  firm: string;
  email: string;
};

export type SignalSeverity = "missing" | "review" | "stale";
export type SignalCategory = "missing" | "conflict" | "risk" | "recommendation";

export type Signal = {
  id: string;
  severity: SignalSeverity;
  category: SignalCategory;
  title: string;
  reason: string;
  suggestedAction?: string;
  memberIds: string[];
  relatedDocumentId?: string;
  suggestedProfessionalId?: string;
};

export type NodeKind = "member" | "document" | "signal" | "professional";

export type LayerKey = "people" | "documents" | "signals" | "professionals";

export type LayerState = Record<LayerKey, boolean>;

export type MemberDocLink = { memberId: string; documentId: string };
export type DocProfLink = { documentId: string; professionalId: string };

export type GraphPayload = {
  members: Member[];
  documents: Document[];
  professionals: Professional[];
  memberDocLinks: MemberDocLink[];
  docProfLinks: DocProfLink[];
  signals: Signal[];
};

export type SelectedNode =
  | { kind: "member"; id: string }
  | { kind: "document"; id: string }
  | { kind: "signal"; id: string }
  | { kind: "professional"; id: string }
  | null;
