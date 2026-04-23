"use client";

import type { ToolCall, ToolMessage } from "@provost/schemas/threads";
import { Button } from "@provost/ui";

export type ToolCallViewProps = {
  toolCall: ToolCall;
  toolMessage?: ToolMessage;
  onApprove?: (toolCallId: string) => void;
  onReject?: (toolCallId: string) => void;
};

export function ToolCallView({ toolCall, toolMessage, onApprove, onReject }: ToolCallViewProps) {
  const status = toolCall.approval?.status ?? "pending";

  if (status === "requested") {
    return (
      <div className="w-full max-w-md rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="font-medium">{toolCall.name}</span>
          <span className="text-xs text-yellow-700">Requires approval</span>
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" onClick={() => onApprove?.(toolCall.id)}>
            Approve
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onReject?.(toolCall.id)}>
            Reject
          </Button>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="w-full max-w-md rounded-lg border border-provost-border-subtle bg-provost-bg-muted p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="font-medium">{toolCall.name}</span>
          <span className="text-provost-text-muted text-xs">Rejected</span>
        </div>
        {toolCall.approval?.status === "rejected" && toolCall.approval.reason && (
          <p className="mt-1 text-provost-text-muted text-xs">{toolCall.approval.reason}</p>
        )}
      </div>
    );
  }

  const resultText = toolMessage?.content
    .filter((c): c is { type: "text"; text: string; name: string | null } => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return (
    <div className="w-full max-w-md rounded-lg border border-provost-border-subtle bg-white p-3 text-sm">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${status === "approved" ? "bg-green-500" : "bg-gray-400"}`}
        />
        <span className="font-medium">{toolCall.name}</span>
        <span className="text-provost-text-muted text-xs">
          {status === "approved" ? "Approved" : toolMessage ? "Completed" : "Running..."}
        </span>
      </div>
      {resultText && (
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-provost-bg-muted p-2 text-provost-text-primary text-xs">
          {resultText}
        </pre>
      )}
    </div>
  );
}
