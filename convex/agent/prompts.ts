import { PROVOST_INSTRUCTIONS } from "@provost/agent";
import { memberContextFragment } from "./prompts/memberContext";
import { pageContextFragment } from "./prompts/pageContext";
import { phaseToneFragment, type StewardshipPhase } from "./prompts/phaseTone";
import { type FamilyRole, roleFramingFragment } from "./prompts/roleFraming";

// Kept around as a fallback in case a future change to the layered builder
// breaks something at runtime — callers can revert by setting
// PROVOST_FALLBACK_PROMPT as the system message.
export const PROVOST_FALLBACK_PROMPT = PROVOST_INSTRUCTIONS;

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
  // Layered fragments — added in the prompt rewrite. Optional so legacy
  // callers without these fields still work.
  stewardshipPhase?: StewardshipPhase | null;
  familyRole?: FamilyRole | null;
  self?: {
    firstName?: string;
    lastName?: string;
    generation?: number;
    stewardshipPhase?: string;
  } | null;
}

function renderRoster(members: FamilyRosterEntry[]): string {
  if (members.length === 0) return "";
  const lines = members.map(
    (m) => `  <member><name>${m.name}</name> (role: ${m.role}, gen: ${m.generation})</member>`,
  );
  return `<family_roster>\n${lines.join("\n")}\n</family_roster>`;
}

export function buildSystemPrompt(context: ProvostPromptContext): string {
  const fragments: string[] = [PROVOST_INSTRUCTIONS];

  // Layered scaffolding: each fragment renders as a self-contained tagged
  // block that's safe to drop when the input is missing.
  const phase = phaseToneFragment(context.stewardshipPhase ?? null);
  if (phase) fragments.push(phase);

  const role = roleFramingFragment(context.familyRole ?? null, context.familyName);
  if (role) fragments.push(role);

  const page = pageContextFragment({
    route: context.route,
    selection: context.selection ?? null,
    visibleState: context.visibleState ?? null,
  });
  if (page) fragments.push(page);

  const self = memberContextFragment(context.self ?? null);
  if (self) fragments.push(self);

  if (context.familyName && !role) {
    fragments.push(`<runtime_context>Current family: ${context.familyName}</runtime_context>`);
  }

  if (context.members && context.members.length > 0) {
    fragments.push(renderRoster(context.members));
  }

  if (context.memories && context.memories.length > 0) {
    const memLines = context.memories.map((m) => `  <memory>${m.text}</memory>`);
    fragments.push(`<family_memory>\n${memLines.join("\n")}\n</family_memory>`);
  }

  return fragments.join("\n\n---\n\n");
}
