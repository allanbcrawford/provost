"use client";

import { MessageBubble } from "@provost/ui";
import type { Turn } from "@/entities/turn/turn";
import { MessageContent } from "./message-content";
import { ToolCallView } from "./tool-call-view";

export type TurnViewProps = {
  turn: Turn;
  onApprove?: (toolCallId: string) => void;
  onReject?: (toolCallId: string) => void;
};

export function TurnView({ turn, onApprove, onReject }: TurnViewProps) {
  const { userMessage, assistantMessages, toolMessages } = turn;

  return (
    <div className="flex flex-col gap-4">
      {userMessage && (
        // biome-ignore lint/a11y/useValidAriaRole: MessageBubble uses `role` as a component prop, not ARIA
        <MessageBubble role="user">
          <MessageContent parts={userMessage.content} markdown={false} />
        </MessageBubble>
      )}

      {assistantMessages.map((message) => {
        const textParts = (message.content ?? []).filter((p) => p.type === "text");
        const toolCalls = message.tool_calls ?? [];

        return (
          <div key={message.id} className="flex flex-col gap-3">
            {textParts.length > 0 && (
              // biome-ignore lint/a11y/useValidAriaRole: MessageBubble uses `role` as a component prop, not ARIA
              <MessageBubble role="assistant">
                <MessageContent parts={textParts} markdown={true} />
              </MessageBubble>
            )}

            {toolCalls.length > 0 && (
              <div className="flex flex-col gap-2">
                {toolCalls.map((toolCall) => {
                  const toolMessage = toolMessages.find((tm) => tm.tool_call_id === toolCall.id);
                  return (
                    <ToolCallView
                      key={toolCall.id}
                      toolCall={toolCall}
                      toolMessage={toolMessage}
                      onApprove={onApprove}
                      onReject={onReject}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
