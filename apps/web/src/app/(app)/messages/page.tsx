"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { InboxList } from "@/features/messages/inbox-list";
import { ThreadView } from "@/features/messages/thread-view";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function MessagesPage() {
  const family = useSelectedFamily();
  const me = useQuery(api.users.meQuery, {});
  const familyId = family?._id as Id<"families"> | undefined;

  const inbox = useQuery(api.messages.listInbox, familyId ? { familyId } : "skip");
  const sent = useQuery(api.messages.listSent, familyId ? { familyId } : "skip");
  const drafts = useQuery(api.messages.listDrafts, family ? {} : "skip");

  const [selectedThreadId, setSelectedThreadId] = useState<Id<"message_threads"> | null>(null);
  const meId = (me as { _id?: Id<"users"> } | null | undefined)?._id ?? null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Messages
        </h1>
      </div>

      <Tabs defaultValue="inbox" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
            <InboxList
              threads={inbox ?? null}
              selectedId={selectedThreadId}
              onSelect={setSelectedThreadId}
            />
            <div>
              {selectedThreadId && familyId ? (
                <ThreadView threadId={selectedThreadId} familyId={familyId} meId={meId} />
              ) : (
                <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
                  Select a conversation to read it.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="drafts">
          {drafts === undefined ? (
            <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>
          ) : drafts.length === 0 ? (
            <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
              No drafts.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
              {drafts.map((d, i) => (
                <li
                  key={d._id}
                  className={`px-5 py-4 ${i > 0 ? "border-t border-provost-border-subtle" : ""}`}
                >
                  <div className="text-[12px] tracking-[-0.36px] text-provost-text-secondary">
                    {new Date(d.updated_at).toLocaleString()}
                  </div>
                  <div className="mt-1 truncate text-[14px] tracking-[-0.42px] text-provost-text-primary">
                    {d.body || "(empty draft)"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sent === undefined ? (
            <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>
          ) : sent.length === 0 ? (
            <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
              No sent messages.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
              {sent.map((m, i) => (
                <li
                  key={m._id}
                  className={`px-5 py-4 ${i > 0 ? "border-t border-provost-border-subtle" : ""}`}
                >
                  <div className="text-[12px] tracking-[-0.36px] text-provost-text-secondary">
                    {new Date(m.sent_at).toLocaleString()} · {m.subject}
                  </div>
                  <div className="mt-1 truncate text-[14px] tracking-[-0.42px] text-provost-text-primary">
                    {m.body}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withRoleGuard(MessagesPage, APP_ROLES.MESSAGES!);
