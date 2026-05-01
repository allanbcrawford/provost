// Stewardship phase auto-assignment helper.
//
// Shared by:
//   - convex/learningBackfill.ts (demo seeder fallback)
//   - convex/agent/tools/addFamilyMember.ts (Issue 2.1, in-flight)
//   - any future onboarding flow that needs to derive a default phase before
//     an advisor confirms it on the family page (Issue 2.2 override UI).
//
// Default rule table (pending Brad confirmation per
// docs/brad-decisions-2026-04.md — DO NOT TREAT AS FINAL):
//
//   role === "trustee" || role === "grantor"        -> enduring  (overrides age)
//   age >= 60                                       -> enduring
//   age >= 35 AND active role                       -> operating
//   age >= 22                                       -> developing
//   age <  22                                       -> emerging
//   age missing AND role missing                    -> emerging  (safe default
//                                                                  for kids
//                                                                  added w/o DOB)
//
// "Active role" is interpreted loosely: anything that signals the member is
// engaged in family wealth operations rather than a passive beneficiary.
// Currently: spouse, beneficiary, child, advisor, admin, member, employee,
// cfo, director, bookkeeper. Unknown roles fall through to the age-only path.
//
// Thresholds (22 / 35 / 60) are placeholders awaiting Brad's sign-off. When
// he confirms, update both this table and the doc reference above.

export type StewardshipPhase = "emerging" | "developing" | "operating" | "enduring";

export const STEWARDSHIP_PHASES: readonly StewardshipPhase[] = [
  "emerging",
  "developing",
  "operating",
  "enduring",
] as const;

const ENDURING_ROLES = new Set(["trustee", "grantor"]);

const ACTIVE_ROLES = new Set([
  "spouse",
  "beneficiary",
  "child",
  "advisor",
  "admin",
  "member",
  "employee",
  "cfo",
  "director",
  "bookkeeper",
]);

function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const trimmed = role.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function assignStewardshipPhase(args: {
  age?: number | null;
  role?: string | null;
}): StewardshipPhase {
  const role = normalizeRole(args.role);
  const age = typeof args.age === "number" && Number.isFinite(args.age) ? args.age : null;

  // Trustees / grantors are always enduring stewards regardless of age.
  if (role && ENDURING_ROLES.has(role)) return "enduring";

  // No age signal: fall back to emerging (safe for kids added w/o DOB).
  if (age === null) return "emerging";

  if (age >= 60) return "enduring";
  if (age >= 35 && role !== null && ACTIVE_ROLES.has(role)) return "operating";
  if (age >= 22) return "developing";
  return "emerging";
}
