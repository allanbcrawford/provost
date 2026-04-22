import { z } from "zod";

const base = {
  sequence: z.number(),
  timestamp: z.number(),
};

export const RunStartedEventSchema = z.object({
  ...base,
  type: z.literal("run_started"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
  }),
});

export const RunPausedEventSchema = z.object({
  ...base,
  type: z.literal("run_paused"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
  }),
});

export const RunResumedEventSchema = z.object({
  ...base,
  type: z.literal("run_resumed"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
  }),
});

export const RunFinishedEventSchema = z.object({
  ...base,
  type: z.literal("run_finished"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
  }),
});

export const RunErrorEventSchema = z.object({
  ...base,
  type: z.literal("run_error"),
  data: z.object({
    thread_id: z.string().optional(),
    run_id: z.string().optional(),
    message: z.string(),
  }),
});

export const StepStartedEventSchema = z.object({
  ...base,
  type: z.literal("step_started"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    name: z.string().nullable(),
  }),
});

export const StepFinishedEventSchema = z.object({
  ...base,
  type: z.literal("step_finished"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
  }),
});

export const MessageStartedEventSchema = z.object({
  ...base,
  type: z.literal("message_started"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    role: z.enum(["user", "assistant", "tool"]),
    tool_call_id: z.string().nullable(),
    name: z.string().nullable(),
  }),
});

export const MessageFinishedEventSchema = z.object({
  ...base,
  type: z.literal("message_finished"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
  }),
});

export const ContentStartedEventSchema = z.object({
  ...base,
  type: z.literal("content_started"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    index: z.number(),
    content_type: z.enum(["text", "image", "file"]),
    content: z.string().nullable(),
    name: z.string().nullable(),
  }),
});

export const ContentDeltaEventSchema = z.object({
  ...base,
  type: z.literal("content_delta"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    index: z.number(),
    content: z.string(),
  }),
});

export const ContentFinishedEventSchema = z.object({
  ...base,
  type: z.literal("content_finished"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    index: z.number(),
  }),
});

export const ToolCallStartedEventSchema = z.object({
  ...base,
  type: z.literal("tool_call_started"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    tool_call_id: z.string(),
    name: z.string(),
    arguments: z.string().nullable(),
    require_approval: z.boolean(),
  }),
});

export const ToolCallDeltaEventSchema = z.object({
  ...base,
  type: z.literal("tool_call_delta"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    tool_call_id: z.string(),
    arguments: z.string(),
  }),
});

export const WidgetPayloadSchema = z.object({
  kind: z.string(),
  props: z.unknown(),
});

export const ToolCallFinishedEventSchema = z.object({
  ...base,
  type: z.literal("tool_call_finished"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    tool_call_id: z.string(),
    name: z.string(),
    result: z.unknown(),
    widget: WidgetPayloadSchema.optional(),
  }),
});

export const ToolCallApprovedEventSchema = z.object({
  ...base,
  type: z.literal("tool_call_approved"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    tool_call_id: z.string(),
    user_id: z.string(),
    arguments: z.string().nullable(),
  }),
});

export const ToolCallRejectedEventSchema = z.object({
  ...base,
  type: z.literal("tool_call_rejected"),
  data: z.object({
    thread_id: z.string(),
    run_id: z.string(),
    message_id: z.string(),
    tool_call_id: z.string(),
    user_id: z.string(),
    reason: z.string().nullable(),
  }),
});

export const RunEventSchema = z.discriminatedUnion("type", [
  RunStartedEventSchema,
  RunPausedEventSchema,
  RunResumedEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
  StepStartedEventSchema,
  StepFinishedEventSchema,
  MessageStartedEventSchema,
  MessageFinishedEventSchema,
  ContentStartedEventSchema,
  ContentDeltaEventSchema,
  ContentFinishedEventSchema,
  ToolCallStartedEventSchema,
  ToolCallDeltaEventSchema,
  ToolCallFinishedEventSchema,
  ToolCallApprovedEventSchema,
  ToolCallRejectedEventSchema,
]);

export type RunEvent = z.infer<typeof RunEventSchema>;
export type WidgetPayload = z.infer<typeof WidgetPayloadSchema>;
