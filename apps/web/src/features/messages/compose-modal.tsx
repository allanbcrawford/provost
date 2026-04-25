"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@provost/ui";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { type RecipientContact, RecipientPicker } from "./recipient-picker";

export function ComposeModal({
  open,
  onOpenChange,
  familyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: Id<"families">;
}) {
  const router = useRouter();
  const sendMessage = useMutation(api.messages.sendMessage);
  const saveDraft = useMutation(api.messages.saveDraft);

  const [recipients, setRecipients] = useState<RecipientContact[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"send" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRecipients([]);
    setSubject("");
    setBody("");
    setError(null);
    setBusy(null);
  }

  function close() {
    onOpenChange(false);
    // Defer reset until after the dialog close transition
    setTimeout(reset, 200);
  }

  async function handleSend() {
    setError(null);
    if (recipients.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (subject.trim().length === 0) {
      setError("Subject is required.");
      return;
    }
    if (body.trim().length === 0) {
      setError("Message body cannot be empty.");
      return;
    }
    setBusy("send");
    try {
      const result = await sendMessage({
        familyId,
        recipientUserIds: recipients.map((r) => r._id),
        subject: subject.trim(),
        body,
      });
      onOpenChange(false);
      setTimeout(reset, 200);
      router.push(`/messages?thread=${result.threadId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message.";
      setError(message);
      setBusy(null);
    }
  }

  async function handleSaveDraft() {
    setError(null);
    setBusy("draft");
    try {
      await saveDraft({
        familyId,
        recipientUserIds: recipients.map((r) => r._id),
        body,
      });
      onOpenChange(false);
      setTimeout(reset, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save draft.";
      setError(message);
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-recipients">To</Label>
            <RecipientPicker familyId={familyId} selected={recipients} onChange={setRecipients} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-body">Message</Label>
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your message…"
              className="resize-y rounded-[10px] border border-provost-border-subtle bg-white px-3 py-2 text-[14px] text-provost-text-primary leading-[1.4] tracking-[-0.42px] outline-none placeholder:text-provost-text-secondary focus:border-provost-text-primary"
            />
          </div>
          {error && (
            <p className="text-[13px] text-red-600 tracking-[-0.39px]" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={busy !== null}
            className="h-[35px] rounded-full px-5 font-medium text-[13px]"
          >
            {busy === "draft" ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={busy !== null}
            className="h-[35px] rounded-full px-5 font-medium text-[13px]"
          >
            {busy === "send" ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
