import type {
  AssistantMessage,
  Message,
  ToolCall,
  ToolMessage,
  UserMessage,
} from "@provost/schemas/threads";

export type Turn = {
  id: string;
  messages: Message[];
  userMessage: UserMessage | undefined;
  assistantMessages: AssistantMessage[];
  toolMessages: ToolMessage[];
  toolCalls: ToolCall[];
};

export function makeTurn(messages: Message[]): Turn {
  const userMessage = messages.find((m): m is UserMessage => m.role === "user");
  const assistantMessages = messages.filter((m): m is AssistantMessage => m.role === "assistant");
  const toolMessages = messages.filter((m): m is ToolMessage => m.role === "tool");
  const toolCalls = assistantMessages.flatMap((m) => m.tool_calls ?? []);
  return {
    id: messages[0]?.id ?? "",
    messages,
    userMessage,
    assistantMessages,
    toolMessages,
    toolCalls,
  };
}

export function groupByTurn(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  let current: Message[] = [];

  for (const message of messages) {
    if (message.role === "user" && current.length > 0) {
      turns.push(makeTurn(current));
      current = [];
    }
    current.push(message);
  }

  if (current.length > 0) {
    turns.push(makeTurn(current));
  }

  return turns;
}

export function getTurnMessages(turn: Turn): Message[] {
  return turn.messages;
}
