"use client";

import { useAuth } from "@clerk/nextjs";
import { Icon } from "@provost/ui";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type PendingAttachment = {
  fileId: Id<"files">;
  name: string;
  size: number;
};

export type ChatPanelInputProps = {
  onSend: (text: string, fileIds?: Id<"files">[]) => void;
  disabled?: boolean;
  placeholder?: string;
  onPromptIdeas?: () => void;
  // The route the chat panel is currently displayed on. Used to fetch
  // page-contextual prompt suggestions; pass undefined to hide chips
  // (e.g. in full-screen mode where PRD wants generic prompts).
  contextRoute?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ChatPanelInput({
  onSend,
  disabled = false,
  placeholder = "Chat with Provost...",
  onPromptIdeas,
  contextRoute,
}: ChatPanelInputProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadUrlMut = useMutation(api.files.uploadUrl);
  const createFileMut = useMutation(api.files.createFile);

  // Page-contextual prompt suggestions. We read from the cache reactively and
  // fire the action to populate it on first mount per (family, route). The
  // chips show only when the textarea is empty AND we're in floating mode
  // (contextRoute provided). Gated on isSignedIn so sign-out doesn't fire a
  // query while Clerk identity is already cleared but the chat-rail hasn't
  // unmounted yet.
  const { isSignedIn } = useAuth();
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const cacheKey = contextRoute ? `${contextRoute}::` : null;
  const cached = useQuery(
    api.promptSuggestionsRead.read,
    isSignedIn && familyId && cacheKey ? { familyId, cacheKey } : "skip",
  );
  const ensureSuggestions = useAction(api.agent.promptSuggestions.ensure);
  useEffect(() => {
    if (!isSignedIn || !familyId || !contextRoute) return;
    if (cached !== null) return; // already loaded (or still loading)
    void ensureSuggestions({ familyId, route: contextRoute }).catch(() => {});
  }, [isSignedIn, familyId, contextRoute, cached, ensureSuggestions]);
  const suggestions = cached?.prompts ?? null;

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    const fileIds = attachments.map((a) => a.fileId);
    onSend(trimmed, fileIds.length > 0 ? fileIds : undefined);
    setValue("");
    setAttachments([]);
  }, [value, disabled, onSend, attachments]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const handleFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;

      setUploadError(null);
      setUploading(true);
      try {
        const uploaded: PendingAttachment[] = [];
        for (const file of files) {
          const url = await uploadUrlMut({});
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!res.ok) throw new Error(`upload failed: ${res.status}`);
          const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
          const { fileId } = await createFileMut({
            storageId,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          });
          uploaded.push({ fileId, name: file.name, size: file.size });
        }
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [uploadUrlMut, createFileMut],
  );

  const removeAttachment = useCallback((fileId: Id<"files">) => {
    setAttachments((prev) => prev.filter((a) => a.fileId !== fileId));
  }, []);

  return (
    <div className="relative rounded-2xl border border-provost-text-primary bg-white p-3">
      {(attachments.length > 0 || uploading || uploadError) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.fileId}
              className="inline-flex items-center gap-1.5 rounded-full border border-provost-border-subtle bg-provost-bg-secondary px-2.5 py-1 text-[12px] text-provost-text-primary"
            >
              <Icon name="attach_file" size={14} />
              <span className="max-w-[160px] truncate">{a.name}</span>
              <span className="text-provost-text-tertiary">{formatSize(a.size)}</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.fileId)}
                className="ml-0.5 text-provost-text-secondary hover:text-provost-text-primary"
                aria-label={`Remove ${a.name}`}
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
          {uploading && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-provost-border-subtle bg-white px-2.5 py-1 text-[12px] text-provost-text-secondary">
              Uploading…
            </span>
          )}
          {uploadError && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-[12px] text-red-700">
              {uploadError}
            </span>
          )}
        </div>
      )}

      {value.trim().length === 0 && suggestions && suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 4).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => {
                setValue(s);
                textareaRef.current?.focus();
              }}
              className="rounded-full border border-provost-border-subtle bg-provost-bg-secondary px-3 py-1 text-[12px] text-provost-text-secondary hover:bg-white hover:text-provost-text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="max-h-[120px] min-h-[48px] w-full resize-none bg-transparent px-2 py-2 text-[15px] placeholder:text-provost-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        rows={1}
      />
      <input ref={fileInputRef} type="file" multiple onChange={handleFiles} className="hidden" />
      <div className="flex items-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="inline-flex h-[35px] items-center gap-1 rounded-full border border-provost-border-default bg-white pr-4 pl-3 text-provost-text-primary transition-colors hover:bg-provost-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="add" size={20} />
            <span className="font-normal text-[14px]">Upload</span>
          </button>
          <button
            type="button"
            onClick={onPromptIdeas}
            className="inline-flex h-[35px] items-center gap-1 rounded-full border border-provost-border-default bg-white px-4 text-provost-text-primary transition-colors hover:bg-provost-bg-secondary"
          >
            <Icon name="asterisk" size={20} />
            <span className="font-normal text-[14px]">Prompt ideas</span>
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled || uploading}
          className="ml-auto flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-provost-border-default bg-white text-provost-text-primary transition-colors hover:bg-provost-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Icon name="arrow_right_alt" size={25} />
        </button>
      </div>
    </div>
  );
}
