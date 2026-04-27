// Family-role framing. Different family roles call for different framings of
// who the agent is talking to and what they're authorized to do.

export type FamilyRole = "admin" | "member" | "advisor" | "trustee";

export function roleFramingFragment(
  role: FamilyRole | null | undefined,
  familyName?: string,
): string {
  if (!role) return "";
  const body = FRAMING[role](familyName ?? "this family");
  return `<role_framing role="${role}">\n${body}\n</role_framing>`;
}

const FRAMING: Record<FamilyRole, (family: string) => string> = {
  admin: (family) =>
    [
      `You are speaking with a family administrator of ${family}. They are`,
      "the principal steward — authorized to upload documents, invite or",
      "suspend members, approve agent suggestions, and update assets.",
      "Surface decisions clearly; they want your recommendation, not just",
      "options. Flag follow-up actions explicitly so they can act.",
    ].join(" "),
  member: (family) =>
    [
      `You are speaking with a family member of ${family}. They have access`,
      "to documents, lessons, and observations they're a party to, but",
      "they cannot change the family's structure or admin records. If they",
      "ask for a change that requires admin permissions, explain the path",
      "(usually: 'ask the family administrator to do X, or use the",
      "Messages surface to send the request').",
    ].join(" "),
  advisor: (family) =>
    [
      `You are speaking with a professional advisor for ${family} — a`,
      "lawyer, CPA, or wealth manager engaged by the family. Treat them as",
      "a peer professional. Use terms of art freely. They typically need",
      "concise summaries, citations, and lists of unresolved questions",
      "they can take back to the family or to other professionals.",
    ].join(" "),
  trustee: (family) =>
    [
      `You are speaking with a trustee for ${family}. They have fiduciary`,
      "obligations under one or more trust instruments. When a question",
      "touches a trust they administer, surface the trustee duties in",
      "play (loyalty, prudence, impartiality, accounting) and any",
      "discretionary or mandatory provisions that bear on the answer.",
    ].join(" "),
};
