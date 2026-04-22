import { z } from "zod";

export const TextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  name: z.string().nullable(),
});

export const ImageContentSchema = z.object({
  type: z.literal("image"),
  image: z.string(),
  name: z.string().nullable(),
  details: z.enum(["high", "low", "auto"]),
});

export const FileContentSchema = z.object({
  type: z.literal("file"),
  file: z.string(),
  name: z.string(),
});

export const ContentSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  FileContentSchema,
]);

export const ToolCallApprovalRequestedSchema = z.object({
  status: z.literal("requested"),
});

export const ToolCallApprovalApprovedSchema = z.object({
  status: z.literal("approved"),
  approved_by: z.string(),
  approved_at: z.number(),
  arguments: z.string().nullable(),
});

export const ToolCallApprovalRejectedSchema = z.object({
  status: z.literal("rejected"),
  rejected_by: z.string(),
  rejected_at: z.number(),
  reason: z.string().nullable(),
});

export const ToolCallApprovalSchema = z.discriminatedUnion("status", [
  ToolCallApprovalRequestedSchema,
  ToolCallApprovalApprovedSchema,
  ToolCallApprovalRejectedSchema,
]);

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string().nullable(),
  approval: ToolCallApprovalSchema.nullable(),
});

const messageBase = {
  id: z.string(),
  created_at: z.number(),
  updated_at: z.number().nullable(),
  deleted_at: z.number().nullable(),
};

export const UserMessageSchema = z.object({
  ...messageBase,
  role: z.literal("user"),
  content: z.array(ContentSchema),
  name: z.string().nullable(),
});

export const AssistantMessageSchema = z.object({
  ...messageBase,
  role: z.literal("assistant"),
  content: z.array(TextContentSchema).nullable(),
  tool_calls: z.array(ToolCallSchema).nullable(),
  name: z.string().nullable(),
});

export const ToolMessageSchema = z.object({
  ...messageBase,
  role: z.literal("tool"),
  tool_call_id: z.string(),
  content: z.array(z.discriminatedUnion("type", [TextContentSchema, FileContentSchema])),
});

export const MessageSchema = z.discriminatedUnion("role", [
  UserMessageSchema,
  AssistantMessageSchema,
  ToolMessageSchema,
]);

export const ThreadSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  family_id: z.string(),
  title: z.string().optional(),
  messages: z.array(MessageSchema),
  current_run_id: z.string().optional(),
  deleted_at: z.number().optional(),
});

export type TextContent = z.infer<typeof TextContentSchema>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type ToolCallApproval = z.infer<typeof ToolCallApprovalSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type ToolMessage = z.infer<typeof ToolMessageSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
