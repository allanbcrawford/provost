"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type PendingApproval = Doc<"tool_call_approvals"> & {
  requester: { name: string; email: string } | null;
};

type DecidedApproval = Doc<"tool_call_approvals"> & {
  requester: { name: string; email: string } | null;
  decider: { name: string; email: string } | null;
};

export function ApprovalsQueue({ familyId }: { familyId: Id<"families"> }) {
  return (
    <Tabs defaultValue="pending" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="recent">Recent decisions</TabsTrigger>
      </TabsList>
      <TabsContent value="pending">
        <PendingList familyId={familyId} />
      </TabsContent>
      <TabsContent value="recent">
        <RecentDecisionsList familyId={familyId} />
      </TabsContent>
    </Tabs>
  );
}

function PendingList({ familyId }: { familyId: Id<"families"> }) {
  const pending = useQuery(api.governance.pendingApprovals, { familyId });
  const approve = useMutation(api.agent.approvals.approve);
  const reject = useMutation(api.agent.approvals.reject);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onApprove(toolCallId: string) {
    setBusy(toolCallId);
    try {
      await approve({ toolCallId });
    } finally {
      setBusy(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const toolCallId = rejectTarget.tool_call_id;
    setBusy(toolCallId);
    try {
      await reject({
        toolCallId,
        reason: rejectReason.trim() ? rejectReason.trim() : undefined,
      });
      setRejectTarget(null);
      setRejectReason("");
    } finally {
      setBusy(null);
    }
  }

  if (pending === undefined) {
    return <div className="text-provost-text-secondary text-sm">Loading…</div>;
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 border-dashed p-8 text-center text-provost-text-secondary text-sm">
        No pending approvals.
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {(pending as PendingApproval[]).map((a) => {
          const isOpen = expanded.has(a._id);
          return (
            <li
              key={a._id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 text-xs">
                      pending
                    </span>
                    <h3 className="font-medium font-mono text-sm">{a.tool_name}</h3>
                  </div>
                  <p className="text-provost-text-secondary text-xs">
                    Requested by {a.requester?.name ?? "—"} ·{" "}
                    {new Date(a._creationTime).toLocaleString()}
                  </p>
                  <Link
                    href={`/governance/audit?search=${a.thread_run_id}`}
                    className="text-provost-text-secondary text-xs underline hover:text-provost-text-primary"
                  >
                    Context: thread/run {a.thread_run_id.slice(-6)}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectTarget(a)}
                    disabled={busy === a.tool_call_id}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(a.tool_call_id)}
                    disabled={busy === a.tool_call_id}
                  >
                    Approve
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleExpand(a._id)}
                className="self-start text-provost-text-secondary text-xs underline hover:text-provost-text-primary"
              >
                {isOpen ? "Hide arguments" : "Show arguments"}
              </button>
              {isOpen && (
                <pre className="overflow-x-auto rounded bg-neutral-50 p-3 text-neutral-700 text-xs">
                  {JSON.stringify(a.arguments, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject tool call</DialogTitle>
            <DialogDescription>
              Provide an optional reason. This will be stored with the decision and shown in the
              audit log.
            </DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-provost-text-secondary text-xs">
                {rejectTarget.tool_name}
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Reason (optional)"
                className="w-full rounded-[8px] border border-provost-border-subtle bg-white p-3 text-sm text-provost-text-primary shadow-xs outline-none placeholder:text-provost-text-secondary focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button onClick={submitReject} disabled={busy !== null}>
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecentDecisionsList({ familyId }: { familyId: Id<"families"> }) {
  const decisions = useQuery(api.governance.recentDecisions, { familyId, limit: 20 });

  if (decisions === undefined) {
    return <div className="text-provost-text-secondary text-sm">Loading…</div>;
  }

  if (decisions.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 border-dashed p-8 text-center text-provost-text-secondary text-sm">
        No decisions yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {(decisions as DecidedApproval[]).map((a) => {
        const isApproved = a.status === "approved";
        return (
          <li
            key={a._id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      isApproved
                        ? "rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 text-xs"
                        : "rounded bg-rose-100 px-2 py-0.5 text-rose-800 text-xs"
                    }
                  >
                    {a.status}
                  </span>
                  <h3 className="font-medium font-mono text-sm">{a.tool_name}</h3>
                </div>
                <p className="text-provost-text-secondary text-xs">
                  Decided by {a.decider?.name ?? "—"} ·{" "}
                  {a.decided_at ? new Date(a.decided_at).toLocaleString() : "—"}
                </p>
                <p className="text-provost-text-secondary text-xs">
                  Requested by {a.requester?.name ?? "—"}
                </p>
              </div>
              <Link
                href={`/governance/audit?search=${a.thread_run_id}`}
                className="text-provost-text-secondary text-xs underline hover:text-provost-text-primary"
              >
                Context
              </Link>
            </div>
            {a.decision_reason && (
              <p className="rounded bg-neutral-50 p-2 text-neutral-700 text-xs">
                Reason: {a.decision_reason}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
