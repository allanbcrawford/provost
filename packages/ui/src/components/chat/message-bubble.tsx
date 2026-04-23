"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "../../utils/cn";

export type MessageBubbleRole = "user" | "assistant" | "tool";

export interface MessageBubbleProps extends ComponentPropsWithoutRef<"div"> {
  role: MessageBubbleRole;
}

const roleContainer: Record<MessageBubbleRole, string> = {
  user: "flex w-full justify-end",
  assistant: "flex w-full justify-start",
  tool: "flex w-full justify-start",
};

const roleBubble: Record<MessageBubbleRole, string> = {
  user: "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-provost-accent-blue text-white",
  assistant:
    "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-provost-bg-muted text-provost-text-primary",
  tool: "w-full max-w-md rounded-lg border border-provost-border-subtle bg-white px-3 py-2 text-sm text-provost-text-primary",
};

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ role, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(roleContainer[role], className)} {...props}>
        <div className={cn(roleBubble[role])} data-role={role}>
          {children}
        </div>
      </div>
    );
  },
);
MessageBubble.displayName = "MessageBubble";
