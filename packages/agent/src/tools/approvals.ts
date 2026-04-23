// Defense-in-depth duplicate of the approvalRequired flags in
// register-all.ts. The Convex run loop imports this map so that a tool
// with an unknown / mismatched registry entry is still gated.
// Keep in sync with register-all.ts until a shared constant is introduced.
export const APPROVAL_REQUIRED_TOOLS: Record<string, boolean> = {
  navigate: false,
  form: false,
  render_waterfall_simulation: false,
  render_family_graph: false,
  explain_document: false,
  generate_signals: false,
  draft_revision: true,
  create_task: true,
  search_library: false,
  summarize_lesson: false,
  assign_lesson: true,
  invite_member: true,
  attach_file: false,
  list_observations: false,
};

export function requiresApproval(toolName: string, registryFlag: boolean | undefined): boolean {
  const mapFlag = APPROVAL_REQUIRED_TOOLS[toolName];
  // If neither source knows the tool, fail closed: require approval.
  if (mapFlag === undefined && registryFlag === undefined) return true;
  return Boolean(mapFlag) || Boolean(registryFlag);
}
