import { z } from "zod";

export const NavigateArgsSchema = z.object({
  path: z.string(),
});
export type NavigateArgs = z.infer<typeof NavigateArgsSchema>;

export const FormFieldSchema = z.object({
  label: z.string(),
  name: z.string(),
  type: z.enum(["text", "number", "email", "phone", "date", "select", "textarea"]),
  required: z.boolean().optional(),
  default_value: z.any().optional(),
  options: z.array(z.string()).optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormArgsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema),
});
export type FormArgs = z.infer<typeof FormArgsSchema>;

export const InviteMemberArgsSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin", "advisor", "trustee"]).optional(),
});
export type InviteMemberArgs = z.infer<typeof InviteMemberArgsSchema>;

export const AttachFileArgsSchema = z.object({
  file_id: z.string(),
});
export type AttachFileArgs = z.infer<typeof AttachFileArgsSchema>;

export const ListObservationsArgsSchema = z.object({});
export type ListObservationsArgs = z.infer<typeof ListObservationsArgsSchema>;

export const RenderWaterfallSimulationArgsSchema = z.object({
  scenario: z.object({
    revisions: z
      .object({
        fundRevocable: z.boolean().optional(),
        ilit: z.boolean().optional(),
        buysell: z.boolean().optional(),
        portability: z.boolean().optional(),
        qtip: z.boolean().optional(),
      })
      .optional(),
    customEdits: z
      .object({
        childrenPct: z
          .object({
            david: z.number(),
            jennifer: z.number(),
            michael: z.number(),
          })
          .optional(),
        trustBFunding: z.number().optional(),
        deathOrder: z.enum(["robert-first", "linda-first", "simultaneous"]).optional(),
      })
      .optional(),
  }),
});
export type RenderWaterfallSimulationArgs = z.infer<typeof RenderWaterfallSimulationArgsSchema>;

export const RenderFamilyGraphArgsSchema = z.object({
  focus: z.string().optional(),
  layers: z
    .object({
      people: z.boolean(),
      documents: z.boolean(),
      signals: z.boolean(),
      professionals: z.boolean(),
    })
    .partial()
    .optional(),
  flaggedOnly: z.boolean().optional(),
});
export type RenderFamilyGraphArgs = z.infer<typeof RenderFamilyGraphArgsSchema>;

export const GenerateSignalsArgsSchema = z.object({
  scope: z.enum(["all", "member", "document"]),
  memberId: z.string().optional(),
  documentId: z.string().optional(),
});
export type GenerateSignalsArgs = z.infer<typeof GenerateSignalsArgsSchema>;

export const DraftRevisionArgsSchema = z.object({
  signalId: z.string(),
  documentId: z.string().optional(),
  instructions: z.string(),
});
export type DraftRevisionArgs = z.infer<typeof DraftRevisionArgsSchema>;

export const ExplainDocumentArgsSchema = z.object({
  documentId: z.string(),
  page: z.number().optional(),
});
export type ExplainDocumentArgs = z.infer<typeof ExplainDocumentArgsSchema>;

export const CreateTaskArgsSchema = z.object({
  assigneeType: z.enum(["planner", "professional", "member"]),
  title: z.string(),
  body: z.string(),
  assigneeId: z.string().optional(),
  sourceSignalId: z.string().optional(),
});
export type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>;

export const SearchLibraryArgsSchema = z.object({
  query: z.string(),
  facets: z
    .object({
      domain: z.array(z.string()).optional(),
      artifact_type: z.array(z.string()).optional(),
      complexity: z.array(z.string()).optional(),
      functional_use: z.array(z.string()).optional(),
      risk: z.array(z.string()).optional(),
    })
    .optional(),
});
export type SearchLibraryArgs = z.infer<typeof SearchLibraryArgsSchema>;

export const SummarizeLessonArgsSchema = z.object({
  lessonId: z.string(),
  audience: z.enum(["self", "family", "child"]).optional(),
});
export type SummarizeLessonArgs = z.infer<typeof SummarizeLessonArgsSchema>;

/**
 * @deprecated Use `RecommendLessonArgsSchema`. Lesson delivery is rule-based
 * post-P0b — the LLM should not assign with due dates. Kept for the legacy
 * `assign_lesson` tool during the migration window.
 */
export const AssignLessonArgsSchema = z.object({
  lessonId: z.string(),
  memberIds: z.array(z.string()),
  dueDate: z.number().optional(),
});
export type AssignLessonArgs = z.infer<typeof AssignLessonArgsSchema>;

export const RecommendLessonArgsSchema = z.object({
  lessonId: z.string(),
  reason: z.string().optional(),
});
export type RecommendLessonArgs = z.infer<typeof RecommendLessonArgsSchema>;

export const SearchKnowledgeArgsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(25).optional(),
});
export type SearchKnowledgeArgs = z.infer<typeof SearchKnowledgeArgsSchema>;

export const RememberArgsSchema = z.object({
  text: z.string().min(1).max(1_000),
});
export type RememberArgs = z.infer<typeof RememberArgsSchema>;

// Placeholder schema for the future LLM-driven waterfall-state extraction
// tool. Today the handler returns an "approval pending / not yet
// implemented" envelope; once the extractor lands it will read a document
// + propose a structured WaterfallState patch for human review.
export const ExtractWaterfallStateArgsSchema = z.object({
  documentId: z.string(),
  notes: z.string().optional(),
});
export type ExtractWaterfallStateArgs = z.infer<typeof ExtractWaterfallStateArgsSchema>;
