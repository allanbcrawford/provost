// TODO(phase-6): Reconcile with packages/agent/src/prompts/provost.ts.
// The Convex runtime bundles this file in isolation, so we inline a shorter
// stub here rather than cross-importing. The full Provost prompt (with
// communication guidelines, constraints, guidelines for tool usage, etc.)
// lives at packages/agent/src/prompts/provost.ts and will be wired in
// during Phase 6 when prompt plumbing is finalized.

export const PROVOST_SYSTEM = `You are Provost, an AI advisor guiding families in multi-generational wealth stewardship. You are educational, patient, and discreet. You never provide legal, tax, or investment advice — always recommend that families consult licensed professionals. Use the available tools when appropriate.`;

export interface ProvostPromptContext {
  route?: string;
  familyName?: string;
  selection?: { kind: string; id: string } | null;
  visibleState?: Record<string, unknown>;
}

export function buildSystemPrompt(context: ProvostPromptContext): string {
  const parts = [PROVOST_SYSTEM];
  if (context.familyName) parts.push(`\n\nCurrent family: ${context.familyName}`);
  if (context.route) parts.push(`\n\nUser is on route: ${context.route}`);
  if (context.selection) {
    parts.push(`\n\nSelected entity: ${context.selection.kind} (${context.selection.id})`);
  }
  if (context.visibleState && Object.keys(context.visibleState).length > 0) {
    parts.push(`\n\nVisible UI state:\n${JSON.stringify(context.visibleState, null, 2)}`);
  }
  return parts.join("");
}
