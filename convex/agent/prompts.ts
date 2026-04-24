import { PROVOST_INSTRUCTIONS } from "@provost/agent";

export type FamilyRosterEntry = {
  name: string;
  role: string;
  generation: number;
};

export interface ProvostPromptContext {
  route?: string;
  familyName?: string;
  selection?: { kind: string; id: string } | null;
  visibleState?: Record<string, unknown>;
  members?: FamilyRosterEntry[];
  memories?: Array<{ text: string; createdAt: number }>;
}

function renderRoster(members: FamilyRosterEntry[]): string {
  if (members.length === 0) return "";
  const lines = members.map(
    (m) => `  <member><name>${m.name}</name> (role: ${m.role}, gen: ${m.generation})</member>`,
  );
  return `\n\n<family_roster>\n${lines.join("\n")}\n</family_roster>`;
}

export function buildSystemPrompt(context: ProvostPromptContext): string {
  const parts: string[] = [PROVOST_INSTRUCTIONS];

  const runtime: string[] = [];
  if (context.familyName) runtime.push(`Current family: ${context.familyName}`);
  if (context.route) runtime.push(`User is on route: ${context.route}`);
  if (context.selection) {
    runtime.push(`Selected entity: ${context.selection.kind} (${context.selection.id})`);
  }
  if (context.visibleState && Object.keys(context.visibleState).length > 0) {
    runtime.push(`Visible UI state:\n${JSON.stringify(context.visibleState, null, 2)}`);
  }
  if (runtime.length > 0) {
    parts.push(`\n\n<runtime_context>\n${runtime.join("\n\n")}\n</runtime_context>`);
  }

  if (context.members && context.members.length > 0) {
    parts.push(renderRoster(context.members));
  }

  if (context.memories && context.memories.length > 0) {
    const memLines = context.memories.map((m) => `  <memory>${m.text}</memory>`);
    parts.push(`\n\n<family_memory>\n${memLines.join("\n")}\n</family_memory>`);
  }

  return parts.join("");
}
