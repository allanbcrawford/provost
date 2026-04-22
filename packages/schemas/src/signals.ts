import { z } from "zod";

export const SignalSeveritySchema = z.enum(["missing", "review", "stale"]);
export const SignalCategorySchema = z.enum(["missing", "conflict", "risk", "recommendation"]);
export const SignalStatusSchema = z.enum([
  "open",
  "drafting",
  "sent_to_planner",
  "resolved",
  "dismissed",
]);
export const SignalSourceSchema = z.enum(["rule", "llm", "manual"]);

export const SignalSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  family_id: z.string(),
  severity: SignalSeveritySchema,
  category: SignalCategorySchema,
  title: z.string(),
  reason: z.string(),
  suggested_action: z.string().optional(),
  member_ids: z.array(z.string()),
  related_document_id: z.string().optional(),
  suggested_professional_id: z.string().optional(),
  status: SignalStatusSchema,
  source: SignalSourceSchema,
  rule_key: z.string().optional(),
});

export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;
export type SignalCategory = z.infer<typeof SignalCategorySchema>;
export type SignalStatus = z.infer<typeof SignalStatusSchema>;
export type SignalSource = z.infer<typeof SignalSourceSchema>;
export type Signal = z.infer<typeof SignalSchema>;
