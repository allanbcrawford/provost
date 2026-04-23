export type RevisionKey = "fundRevocable" | "ilit" | "buysell" | "portability" | "qtip";

export type RevisionState = Record<RevisionKey, boolean>;

export type DeathOrder = "robert-first" | "linda-first" | "simultaneous";

export type ChildrenPct = { david: number; jennifer: number; michael: number };

export type CustomEdits = {
  childrenPct?: ChildrenPct;
  trustBFunding?: number;
  deathOrder?: DeathOrder;
};

export type EditableNodeId = "david" | "jennifer" | "michael" | "trustB" | "firstDeath";

export const DEFAULT_REVISIONS: RevisionState = {
  fundRevocable: false,
  ilit: false,
  buysell: false,
  portability: false,
  qtip: false,
};

export const DEFAULT_CHILDREN_PCT: ChildrenPct = { david: 40, jennifer: 40, michael: 20 };
export const DEFAULT_TRUST_B_FUNDING = 7.0;
