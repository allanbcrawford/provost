"use client";

import {
  type KeyboardEvent,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";

export interface ChatInputProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  pendingApproval?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

const MAX_HEIGHT = 160;

export function ChatInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  pendingApproval = false,
  value: controlledValue,
  onValueChange,
  className,
  ...rest
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend, setValue]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {pendingApproval && (
        <div className="px-1 text-provost-text-muted text-xs">Approvals pending...</div>
      )}
      <div className="relative flex items-end gap-2 rounded-2xl border border-provost-border-default bg-white p-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed",
            "placeholder:text-provost-text-muted",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...rest}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
