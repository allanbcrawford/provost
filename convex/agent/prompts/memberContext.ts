// Member-self context. Gives the agent enough to address the user by name
// and reference their place in the family.

type MemberSelf = {
  firstName?: string;
  lastName?: string;
  generation?: number;
  stewardshipPhase?: string;
};

export function memberContextFragment(self: MemberSelf | null | undefined): string {
  if (!self) return "";
  const lines: string[] = [];
  const fullName = [self.firstName, self.lastName].filter(Boolean).join(" ");
  if (fullName) lines.push(`The user's name is ${fullName}.`);
  if (self.generation !== undefined) lines.push(`They are generation ${self.generation}.`);
  if (self.stewardshipPhase) {
    lines.push(`Their stewardship phase is "${self.stewardshipPhase}".`);
  }
  if (lines.length === 0) return "";
  return `<member_self>\n${lines.join(" ")}\n</member_self>`;
}
