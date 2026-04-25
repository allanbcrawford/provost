export type RevisionKey =
  | "fundRevocable"
  | "ilit"
  | "buysell"
  | "portability"
  | "qtip"
  | "addResiduaryToSpouse";

export type RevisionState = Record<RevisionKey, boolean>;

export type DeathOrder = "robert-first" | "linda-first" | "simultaneous";

export type ChildrenPct = { david: number; jennifer: number; michael: number };

// Document categories that participate in waterfall aggregation. Trusts
// supersede wills per product call (Q31.1=A); category drives priority.
export type AgreementCategory = "revocable_trust" | "irrevocable_trust" | "will";

export type SelectedAgreement = {
  documentId: string;
  name: string;
  category: AgreementCategory;
};

export type CustomEdits = {
  childrenPct?: ChildrenPct;
  trustBFunding?: number;
  deathOrder?: DeathOrder;
  // P3.4 multi-agreement selector. When non-empty, the diagram derives its
  // node set from these documents (trust > will priority). Empty = legacy
  // single-scenario behavior.
  selectedAgreements?: SelectedAgreement[];
};

export type EditableNodeId = "david" | "jennifer" | "michael" | "trustB" | "firstDeath";

export const DEFAULT_REVISIONS: RevisionState = {
  fundRevocable: false,
  ilit: false,
  buysell: false,
  portability: false,
  qtip: false,
  addResiduaryToSpouse: false,
};

export const DEFAULT_CHILDREN_PCT: ChildrenPct = { david: 40, jennifer: 40, michael: 20 };
export const DEFAULT_TRUST_B_FUNDING = 7.0;

// Priority order: lower number = higher priority. Trust supersedes will for
// any asset both touch (Q31.1=A). Used by the unallocated-asset reconciler
// when it needs to decide which agreement "owns" an asset.
export const AGREEMENT_PRIORITY: Record<AgreementCategory, number> = {
  revocable_trust: 0,
  irrevocable_trust: 1,
  will: 2,
};
