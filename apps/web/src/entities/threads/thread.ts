import type { RunEvent } from "@provost/schemas/runs";
import type {
  AssistantMessage,
  Message,
  TextContent,
  Thread as ThreadSchema,
  ToolCall,
  ToolCallApproval,
  ToolMessage,
  UserMessage,
} from "@provost/schemas/threads";
import type { RunStatus } from "@/entities/runs/types";

export type ThreadState = {
  id: string;
  family_id: string;
  title: string | null;
  messages: Message[];
  run_id: string | null;
  status: RunStatus;
  created_at: number;
  updated_at: number | null;
  deleted_at: number | null;
};

export function threadFromSchema(thread: ThreadSchema): ThreadState {
  return {
    id: thread._id,
    family_id: thread.family_id,
    title: thread.title ?? null,
    messages: thread.messages,
    run_id: thread.current_run_id ?? null,
    status: "idle",
    created_at: thread._creationTime,
    updated_at: null,
    deleted_at: thread.deleted_at ?? null,
  };
}

export function emptyThread(
  id: string,
  familyId: string,
  createdAt: number = Date.now(),
): ThreadState {
  return {
    id,
    family_id: familyId,
    title: null,
    messages: [],
    run_id: null,
    status: "idle",
    created_at: createdAt,
    updated_at: null,
    deleted_at: null,
  };
}

export function threadTitle(thread: ThreadState): string {
  return thread.title ?? `Thread #${thread.id.slice(0, 4)}`;
}

function updateMessage<T extends Message>(
  messages: Message[],
  messageId: string,
  updater: (msg: T) => T,
): Message[] {
  return messages.map((m) => (m.id === messageId ? updater(m as T) : m));
}

function appendTextContent(
  content: TextContent[] | null | undefined,
  text: string,
  name: string | null,
): TextContent[] {
  return [...(content ?? []), { type: "text", text, name }];
}

function deltaContentAt(
  content: TextContent[] | null | undefined,
  index: number,
  delta: string,
): TextContent[] {
  const list = content ?? [];
  return list.map((c, i) => (i === index ? { ...c, text: c.text + delta } : c));
}

function startToolCall(
  tool_calls: ToolCall[] | null | undefined,
  id: string,
  name: string,
  args: string | null,
  requireApproval: boolean,
): ToolCall[] {
  const approval: ToolCallApproval | null = requireApproval ? { status: "requested" } : null;
  return [...(tool_calls ?? []), { id, name, arguments: args, approval }];
}

function updateToolCall(
  tool_calls: ToolCall[] | null | undefined,
  toolCallId: string,
  updater: (tc: ToolCall) => ToolCall,
): ToolCall[] {
  return (tool_calls ?? []).map((tc) => (tc.id === toolCallId ? updater(tc) : tc));
}

export function applyEvent(state: ThreadState, event: RunEvent): ThreadState {
  const touchesThread = "thread_id" in event.data && event.data.thread_id === state.id;
  if (!touchesThread && event.type !== "run_error") return state;

  switch (event.type) {
    case "run_started":
      return {
        ...state,
        run_id: event.data.run_id,
        status: "streaming",
        updated_at: event.timestamp,
      };
    case "run_paused":
      return {
        ...state,
        run_id: event.data.run_id,
        status: "paused",
        updated_at: event.timestamp,
      };
    case "run_resumed":
      return {
        ...state,
        run_id: event.data.run_id,
        status: "streaming",
        updated_at: event.timestamp,
      };
    case "run_finished":
      return {
        ...state,
        run_id: null,
        status: "idle",
        updated_at: event.timestamp,
      };
    case "run_error": {
      if (event.data.thread_id && event.data.thread_id !== state.id) return state;
      const errorMessage: AssistantMessage = {
        id: `error-${event.timestamp}`,
        created_at: event.timestamp,
        updated_at: null,
        deleted_at: null,
        role: "assistant",
        content: [
          { type: "text", text: "Sorry, something went wrong. Please try again.", name: null },
        ],
        tool_calls: null,
        name: null,
      };
      return {
        ...state,
        run_id: null,
        status: "idle",
        updated_at: event.timestamp,
        messages: [...state.messages, errorMessage],
      };
    }
    case "step_started":
    case "step_finished":
      return { ...state, updated_at: event.timestamp };
    case "message_started": {
      const { message_id, role, name, tool_call_id } = event.data;
      let message: Message;
      if (role === "user") {
        message = {
          id: message_id,
          created_at: event.timestamp,
          updated_at: null,
          deleted_at: null,
          role: "user",
          content: [],
          name,
        } as UserMessage;
      } else if (role === "assistant") {
        message = {
          id: message_id,
          created_at: event.timestamp,
          updated_at: null,
          deleted_at: null,
          role: "assistant",
          content: [],
          tool_calls: [],
          name,
        } as AssistantMessage;
      } else {
        message = {
          id: message_id,
          created_at: event.timestamp,
          updated_at: null,
          deleted_at: null,
          role: "tool",
          tool_call_id: tool_call_id ?? "",
          content: [],
        } as ToolMessage;
      }
      return {
        ...state,
        messages: [...state.messages, message],
        updated_at: event.timestamp,
      };
    }
    case "message_finished":
      return { ...state, updated_at: event.timestamp };
    case "content_started": {
      const { message_id, content_type, content, name } = event.data;
      if (content_type !== "text") return { ...state, updated_at: event.timestamp };
      const messages = state.messages.map((m) => {
        if (m.id !== message_id) return m;
        if (m.role === "user") {
          return {
            ...m,
            content: appendTextContent(m.content as TextContent[], content ?? "", name),
          };
        }
        if (m.role === "assistant") {
          return { ...m, content: appendTextContent(m.content, content ?? "", name) };
        }
        if (m.role === "tool") {
          return {
            ...m,
            content: appendTextContent(m.content as TextContent[], content ?? "", name),
          };
        }
        return m;
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    case "content_delta": {
      const { message_id, index, content } = event.data;
      const messages = state.messages.map((m) => {
        if (m.id !== message_id) return m;
        if (m.role === "user") {
          return { ...m, content: deltaContentAt(m.content as TextContent[], index, content) };
        }
        if (m.role === "assistant") {
          return { ...m, content: deltaContentAt(m.content, index, content) };
        }
        if (m.role === "tool") {
          return { ...m, content: deltaContentAt(m.content as TextContent[], index, content) };
        }
        return m;
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    case "content_finished":
      return { ...state, updated_at: event.timestamp };
    case "tool_call_started": {
      const { message_id, tool_call_id, name, arguments: args, require_approval } = event.data;
      const messages = updateMessage<AssistantMessage>(state.messages, message_id, (m) => {
        if (m.role !== "assistant") return m;
        return {
          ...m,
          tool_calls: startToolCall(m.tool_calls, tool_call_id, name, args, require_approval),
        };
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    case "tool_call_delta": {
      const { message_id, tool_call_id, arguments: args } = event.data;
      const messages = updateMessage<AssistantMessage>(state.messages, message_id, (m) => {
        if (m.role !== "assistant") return m;
        return {
          ...m,
          tool_calls: updateToolCall(m.tool_calls, tool_call_id, (tc) => ({
            ...tc,
            arguments: (tc.arguments ?? "") + args,
          })),
        };
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    case "tool_call_finished":
      return { ...state, updated_at: event.timestamp };
    case "tool_call_approved": {
      const { message_id, tool_call_id, user_id, arguments: args } = event.data;
      const messages = updateMessage<AssistantMessage>(state.messages, message_id, (m) => {
        if (m.role !== "assistant") return m;
        return {
          ...m,
          tool_calls: updateToolCall(m.tool_calls, tool_call_id, (tc) => ({
            ...tc,
            approval: {
              status: "approved",
              approved_by: user_id,
              approved_at: event.timestamp,
              arguments: args,
            },
          })),
        };
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    case "tool_call_rejected": {
      const { message_id, tool_call_id, user_id, reason } = event.data;
      const messages = updateMessage<AssistantMessage>(state.messages, message_id, (m) => {
        if (m.role !== "assistant") return m;
        return {
          ...m,
          tool_calls: updateToolCall(m.tool_calls, tool_call_id, (tc) => ({
            ...tc,
            approval: {
              status: "rejected",
              rejected_by: user_id,
              rejected_at: event.timestamp,
              reason,
            },
          })),
        };
      });
      return { ...state, messages, updated_at: event.timestamp };
    }
    default:
      return state;
  }
}

export function applyEvents(state: ThreadState, events: RunEvent[]): ThreadState {
  return events.reduce(applyEvent, state);
}
