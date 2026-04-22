import { z } from "zod";

const convexMeta = {
  _id: z.string(),
  _creationTime: z.number(),
};

export const UserSchema = z.object({
  ...convexMeta,
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().optional(),
  email: z.string(),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  home_location: z.string().optional(),
  education: z.string().optional(),
  role: z.enum(["admin", "member"]),
  generation: z.number(),
  father_id: z.string().optional(),
  mother_id: z.string().optional(),
  spouse_id: z.string().optional(),
  clerk_user_id: z.string(),
  learning_path: z.string().optional(),
  onboarding_status: z.string(),
  deleted_at: z.number().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const FamilySchema = z.object({
  ...convexMeta,
  name: z.string(),
  description: z.string().optional(),
  created_by: z.string(),
  deleted_at: z.number().optional(),
});
export type Family = z.infer<typeof FamilySchema>;

export const DocumentSchema = z.object({
  ...convexMeta,
  family_id: z.string(),
  file_id: z.string().optional(),
  knowledge_graph_id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  summary: z.string().optional(),
  category: z.string(),
  type: z.string(),
  creator_name: z.string().optional(),
  observation_type: z.enum(["observation", "danger"]),
  observation_is_observed: z.boolean(),
  embedding: z.array(z.number()).optional(),
  deleted_at: z.number().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const PageSchema = z.object({
  ...convexMeta,
  document_id: z.string(),
  index: z.number(),
  content: z.string(),
});
export type Page = z.infer<typeof PageSchema>;

export const LessonSchema = z.object({
  ...convexMeta,
  family_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  content: z.unknown(),
  embedding: z.array(z.number()).optional(),
  deleted_at: z.number().optional(),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ObservationSchema = z.object({
  ...convexMeta,
  family_id: z.string(),
  document_id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  why_this_matters: z.string(),
  recommendation: z.string(),
  next_best_actions: z.array(z.string()),
  suggested_prompts: z.array(z.string()),
  status: z.enum(["new", "read", "done"]),
  deleted_at: z.number().optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;

export const ProfessionalSchema = z.object({
  ...convexMeta,
  name: z.string(),
  profession: z.string(),
  firm: z.string(),
  email: z.string(),
});
export type Professional = z.infer<typeof ProfessionalSchema>;

export const LibrarySourceSchema = z.object({
  ...convexMeta,
  family_id: z.string().optional(),
  title: z.string(),
  author: z.string().optional(),
  category: z.string(),
  content: z.string(),
  tags: z.unknown(),
  embedding: z.array(z.number()).optional(),
});
export type LibrarySource = z.infer<typeof LibrarySourceSchema>;
