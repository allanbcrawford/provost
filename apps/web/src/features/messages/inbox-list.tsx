"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";

type Row = {
  _id: Id<"message_threads">;
  subject: string;
  participantNames: string[];
  lastBody: string;
  lastSentAt: number;
  unread: number;
};

export function InboxList({
  threads,
  onSelect,
  selectedId,
}: {
  threads: Row[] | null;
  onSelect: (id: Id<"message_threads">) => void;
  selectedId: Id<"message_threads"> | null;
}) {
  if (threads === null) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (threads.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No conversations yet.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      {threads.map((t, i) => {
        const isSelected = selectedId === t._id;
        return (
          <li key={t._id} className={i > 0 ? "border-t border-provost-border-subtle" : ""}>
            <button
              type="button"
              onClick={() => onSelect(t._id)}
              className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${
                isSelected ? "bg-provost-bg-muted/60" : "hover:bg-provost-bg-muted/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium tracking-[-0.45px] text-provost-text-primary">
                    {t.participantNames.join(", ") || "(no other participants)"}
                  </span>
                  {t.unread > 0 && (
                    <span className="rounded-full bg-provost-text-primary px-2 py-0.5 text-[11px] font-medium text-white">
                      {t.unread}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[13px] font-medium tracking-[-0.39px] text-provost-text-primary">
                  {t.subject}
                </div>
                <div className="mt-1 truncate text-[13px] tracking-[-0.39px] text-provost-text-secondary">
                  {t.lastBody}
                </div>
              </div>
              <div className="text-[12px] tracking-[-0.36px] text-provost-text-secondary whitespace-nowrap">
                {new Date(t.lastSentAt).toLocaleDateString()}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
