export const ROLES = {
  ADMIN: "admin",
  MEMBER: "member",
  ADVISOR: "advisor",
  TRUSTEE: "trustee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ALL_ROLES: Role[] = [ROLES.ADMIN, ROLES.MEMBER, ROLES.ADVISOR, ROLES.TRUSTEE];

export const APP_ROLES: Record<string, Role[]> = {
  HOME: ALL_ROLES,
  MESSAGES: ALL_ROLES,
  EVENTS: ALL_ROLES,
  // Assets are admin/advisor/trustee only — same gate as Signals/Simulations.
  // PRD: "Permission-gated (family admin + advisor only)."
  ASSETS: [ROLES.ADMIN, ROLES.ADVISOR, ROLES.TRUSTEE],
  // Signals is open to all family roles. Backend filterByAccess scopes member
  // visibility to signals where they appear in member_ids[] (rule-engine
  // signals seed party rows for each named member); admins / advisors /
  // trustees see everything in their family. signals.updateStatus uses
  // requireResourceAccess so a member can only mutate signals they're a
  // party on.
  SIGNALS: ALL_ROLES,
  SIMULATIONS: [ROLES.ADMIN, ROLES.ADVISOR, ROLES.TRUSTEE],
  DOCUMENTS: ALL_ROLES,
  LESSONS: [ROLES.ADMIN, ROLES.MEMBER],
  FAMILY: ALL_ROLES,
  PROFESSIONALS: [ROLES.ADMIN, ROLES.ADVISOR, ROLES.TRUSTEE],
  LEGACY: ALL_ROLES,
  SETTINGS: ALL_ROLES,
};
