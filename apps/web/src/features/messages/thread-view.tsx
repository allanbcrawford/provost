"use client";

import { Button } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function ThreadView({
  threadId,
  familyId,
  meId,
}: {
  threadId: Id<"message_threads">;
  familyId: Id<"families">;
  meId: Id<"users"> | null;
}) {
  const thread = useQuery(api.messages.getThread, { threadId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markThreadRead);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Mark messages read whenever the thread is opened.
  useEffect(() => {
    if (thread === undefined) return;
    void markRead({ threadId });
  }, [thread, markRead, threadId]);

  if (thread === undefined) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (thread === null) {
    return (
      <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        Conversation not found.
      </p>
    );
  }

  async function handleSend() {
    if (body.trim().length === 0) return;
    setSending(true);
    try {
      await sendMessage({ familyId, threadId, body });
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-[14px] border border-provost-border-subtle bg-white p-5">
        <h3 className="text-[18px] font-bold leading-[1.26] tracking-[-0.72px] text-provost-text-primary">
          {thread.subject || "(no subject)"}
        </h3>
      </div>
      <ul className="flex flex-col gap-3 overflow-y-auto">
        {thread.messages.map((m) => {
          const mine = meId !== null && m.sender_user_id === meId;
          return (
            <li
              key={m._id}
              className={`max-w-[80%] rounded-[14px] px-4 py-3 ${
                mine
                  ? "ml-auto bg-provost-text-primary text-white"
                  : "bg-white border border-provost-border-subtle text-provost-text-primary"
              }`}
            >
              <div
                className={`text-[12px] tracking-[-0.36px] ${
                  mine ? "text-white/80" : "text-provost-text-secondary"
                }`}
              >
                {m.senderName} · {new Date(m.sent_at).toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.4] tracking-[-0.42px]">
                {m.body}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="rounded-[14px] border border-provost-border-subtle bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply…"
          rows={3}
          className="w-full resize-none border-0 bg-transparent text-[14px] leading-[1.4] tracking-[-0.42px] text-provost-text-primary outline-none placeholder:text-provost-text-secondary"
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sending || body.trim().length === 0}
            className="h-[35px] rounded-full px-5 text-[13px] font-medium"
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
