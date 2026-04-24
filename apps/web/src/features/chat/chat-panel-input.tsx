"use client";

import { Icon } from "@provost/ui";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

export type ChatPanelInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onUpload?: () => void;
  onPromptIdeas?: () => void;
};

export function ChatPanelInput({
  onSend,
  disabled = false,
  placeholder = "Chat with Provost...",
  onUpload,
  onPromptIdeas,
}: ChatPanelInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <div className="relative rounded-2xl border border-provost-text-primary bg-white p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="min-h-[48px] max-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-[15px] placeholder:text-provost-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        rows={1}
      />
      <div className="flex items-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex h-[35px] items-center gap-1 rounded-full border border-provost-border-default bg-white pl-3 pr-4 text-provost-text-primary transition-colors hover:bg-provost-bg-secondary"
          >
            <Icon name="add" size={20} />
            <span className="text-[14px] font-normal">Upload</span>
          </button>
          <button
            type="button"
            onClick={onPromptIdeas}
            className="inline-flex h-[35px] items-center gap-1 rounded-full border border-provost-border-default bg-white px-4 text-provost-text-primary transition-colors hover:bg-provost-bg-secondary"
          >
            <Icon name="asterisk" size={20} />
            <span className="text-[14px] font-normal">Prompt ideas</span>
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="ml-auto flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-provost-border-default bg-white text-provost-text-primary transition-colors hover:bg-provost-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Icon name="arrow_right_alt" size={25} />
        </button>
      </div>
    </div>
  );
}
