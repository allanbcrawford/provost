import {
  AssignLessonArgsSchema,
  AttachFileArgsSchema,
  CreateTaskArgsSchema,
  DraftRevisionArgsSchema,
  ExplainDocumentArgsSchema,
  ExtractWaterfallStateArgsSchema,
  FormArgsSchema,
  GenerateSignalsArgsSchema,
  InviteMemberArgsSchema,
  ListObservationsArgsSchema,
  NavigateArgsSchema,
  RecommendLessonArgsSchema,
  RememberArgsSchema,
  RenderFamilyGraphArgsSchema,
  RenderWaterfallSimulationArgsSchema,
  SearchKnowledgeArgsSchema,
  SearchLibraryArgsSchema,
  SummarizeLessonArgsSchema,
} from "@provost/schemas/tools";
import { registerTool } from "./registry";

export function registerAllTools(): void {
  registerTool({
    name: "navigate",
    description: "Navigate the user to a specific route in the application.",
    argsSchema: NavigateArgsSchema,
    approvalRequired: false,
    surfaces: ["any"],
    handlerRef: "agent/tools/navigate:handle",
  });

  registerTool({
    name: "form",
    description: "Open a dynamic form to collect structured input from the user.",
    argsSchema: FormArgsSchema,
    approvalRequired: false,
    surfaces: ["any"],
    handlerRef: "agent/tools/form:handle",
  });

  registerTool({
    name: "render_waterfall_simulation",
    description:
      "Open the inheritance waterfall simulation modal with pre-seeded revisions (fundRevocable, ilit, buysell, portability, qtip) and custom edits (childrenPct, trustBFunding, deathOrder).",
    argsSchema: RenderWaterfallSimulationArgsSchema,
    approvalRequired: false,
    surfaces: ["family", "simulations", "any"],
    handlerRef: "agent/tools/renderWaterfallSimulation:handle",
  });

  registerTool({
    name: "render_family_graph",
    description:
      "Focus the family graph on a specific member/document/signal and optionally filter layers or show only flagged entities.",
    argsSchema: RenderFamilyGraphArgsSchema,
    approvalRequired: false,
    surfaces: ["family", "signals", "any"],
    handlerRef: "agent/tools/renderFamilyGraph:handle",
  });

  registerTool({
    name: "explain_document",
    description: "Explain a document (or a specific page) in plain language with page citations.",
    argsSchema: ExplainDocumentArgsSchema,
    approvalRequired: false,
    surfaces: ["documents", "family", "any"],
    handlerRef: "agent/tools/explainDocument:handle",
  });

  registerTool({
    name: "generate_signals",
    description:
      "Scan the family's members and documents with the rule engine and refresh the signals inbox.",
    argsSchema: GenerateSignalsArgsSchema,
    approvalRequired: false,
    surfaces: ["signals", "family", "any"],
    handlerRef: "agent/tools/generateSignals:handle",
  });

  registerTool({
    name: "draft_revision",
    description:
      "Draft a proposed revision to address a specific signal, with citations and professional routing.",
    argsSchema: DraftRevisionArgsSchema,
    approvalRequired: true,
    surfaces: ["signals", "family", "documents", "any"],
    handlerRef: "agent/tools/draftRevision:handle",
  });

  registerTool({
    name: "create_task",
    description:
      "Create a task for a planner, professional, or family member. Use this after drafting a revision or generating actionable recommendations.",
    argsSchema: CreateTaskArgsSchema,
    approvalRequired: true,
    surfaces: ["any"],
    handlerRef: "agent/tools/createTask:handle",
  });

  registerTool({
    name: "search_library",
    description:
      "Search the family's knowledge library with optional tag facets (domain, artifact_type, complexity, functional_use, risk).",
    argsSchema: SearchLibraryArgsSchema,
    approvalRequired: false,
    surfaces: ["library", "any"],
    handlerRef: "agent/tools/searchLibrary:handle",
  });

  registerTool({
    name: "summarize_lesson",
    description:
      "Summarize a lesson for a given audience (self, family, child) as 3-5 bullet points.",
    argsSchema: SummarizeLessonArgsSchema,
    approvalRequired: false,
    surfaces: ["lessons", "any"],
    handlerRef: "agent/tools/summarizeLesson:handle",
  });

  registerTool({
    name: "recommend_lesson",
    description:
      "Surface a lesson the user might find valuable, with a short reason. Does not change delivery — Provost manages active lessons via a rule-based 2-at-a-time system. Use this instead of assign_lesson when nudging the user toward content.",
    argsSchema: RecommendLessonArgsSchema,
    approvalRequired: false,
    surfaces: ["lessons", "any"],
    handlerRef: "agent/tools/recommendLesson:handle",
  });

  // Deprecated. Lesson delivery is rule-based; the LLM should not assign with
  // due dates. Kept registered for the migration window so any in-flight tool
  // calls still resolve, but the description steers the model to
  // `recommend_lesson`.
  registerTool({
    name: "assign_lesson",
    description:
      "DEPRECATED — use `recommend_lesson` instead. Assignment with due dates is no longer the delivery model.",
    argsSchema: AssignLessonArgsSchema,
    approvalRequired: true,
    surfaces: ["lessons", "any"],
    handlerRef: "agent/tools/assignLesson:handle",
  });

  registerTool({
    name: "invite_member",
    description:
      "Invite a new family member by email. Creates a provisional account and sends a Clerk invite link. Requires human approval.",
    argsSchema: InviteMemberArgsSchema,
    approvalRequired: true,
    surfaces: ["family", "any"],
    handlerRef: "agent/tools/inviteMember:handle",
  });

  registerTool({
    name: "attach_file",
    description:
      "Attach an already-uploaded file to the current conversation run so the agent can reference it.",
    argsSchema: AttachFileArgsSchema,
    approvalRequired: true,
    surfaces: ["any"],
    handlerRef: "agent/tools/attachFile:handle",
  });

  registerTool({
    name: "list_observations",
    description: "List all active observations (AI-generated insights and alerts) for the family.",
    argsSchema: ListObservationsArgsSchema,
    approvalRequired: false,
    surfaces: ["family", "documents", "signals", "any"],
    handlerRef: "agent/tools/listObservations:handle",
  });

  registerTool({
    name: "search_knowledge",
    description:
      "Semantic search across the family's documents, assigned lessons, and library sources. Use for factual questions about estate plans, governance docs, or lessons the family has been assigned.",
    argsSchema: SearchKnowledgeArgsSchema,
    approvalRequired: false,
    surfaces: ["any"],
    handlerRef: "agent/tools/searchKnowledge:handle",
  });

  registerTool({
    name: "extract_waterfall_state",
    description:
      "Propose a structured WaterfallState patch (priority class, branches per death order, distributions) for an estate-planning document. Approval-gated; the proposed patch is reviewed by a human before it's written to documents.state. Currently a stub — the handler returns a pending result until the extractor is implemented.",
    argsSchema: ExtractWaterfallStateArgsSchema,
    approvalRequired: true,
    surfaces: ["documents", "family", "any"],
    handlerRef: "agent/tools/extractWaterfallState:handle",
  });

  registerTool({
    name: "remember",
    description:
      "Save a durable, family-scoped note that Provost should recall in future conversations (e.g. 'the family prefers to give to education causes'). Requires explicit user approval.",
    argsSchema: RememberArgsSchema,
    approvalRequired: true,
    surfaces: ["any"],
    handlerRef: "agent/tools/remember:handle",
  });
}
