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
import { Fragment, useState } from "react";
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
    <Tabs defaultValue="pending" className="flex flex-col gap-6">
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
    return (
      <div className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No pending approvals.
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col">
        {(pending as PendingApproval[]).map((a, idx) => {
          const isOpen = expanded.has(a._id);
          return (
            <Fragment key={a._id}>
              {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
              <li className="flex flex-col gap-3 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-[12px] text-amber-800">
                        pending
                      </span>
                      <h3 className="font-medium font-mono text-[14px] text-provost-text-primary tracking-[-0.42px]">
                        {a.tool_name}
                      </h3>
                    </div>
                    <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                      Requested by {a.requester?.name ?? "—"} ·{" "}
                      {new Date(a._creationTime).toLocaleString()}
                    </p>
                    <Link
                      href={`/governance/audit?search=${a.thread_run_id}`}
                      className="self-start text-[13px] text-provost-text-secondary tracking-[-0.39px] underline hover:text-provost-text-primary"
                    >
                      Context: thread/run {a.thread_run_id.slice(-6)}
                    </Link>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(a)}
                      disabled={busy === a.tool_call_id}
                      className="h-[35px] rounded-full px-4 font-medium text-[13px]"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(a.tool_call_id)}
                      disabled={busy === a.tool_call_id}
                      className="h-[35px] rounded-full px-4 font-medium text-[13px]"
                    >
                      Approve
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(a._id)}
                  className="self-start text-[13px] text-provost-text-secondary tracking-[-0.39px] underline hover:text-provost-text-primary"
                >
                  {isOpen ? "Hide arguments" : "Show arguments"}
                </button>
                {isOpen && (
                  <pre className="overflow-x-auto rounded-[8px] bg-provost-bg-muted p-3 font-mono text-[12px] text-provost-text-primary">
                    {JSON.stringify(a.arguments, null, 2)}
                  </pre>
                )}
              </li>
            </Fragment>
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
              <p className="font-mono text-[12px] text-provost-text-secondary">
                {rejectTarget.tool_name}
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Reason (optional)"
                className="w-full rounded-[8px] border border-provost-border-subtle bg-white p-3 text-[14px] text-provost-text-primary tracking-[-0.42px] shadow-xs outline-none placeholder:text-provost-text-secondary focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
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
    return (
      <div className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No decisions yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {(decisions as DecidedApproval[]).map((a, idx) => {
        const isApproved = a.status === "approved";
        return (
          <Fragment key={a._id}>
            {idx > 0 && <li aria-hidden className="h-px bg-[#E5E7EB]" />}
            <li className="flex flex-col gap-2 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        isApproved
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-[12px] text-emerald-800"
                          : "rounded-full bg-rose-100 px-2 py-0.5 font-medium text-[12px] text-rose-800"
                      }
                    >
                      {a.status}
                    </span>
                    <h3 className="font-medium font-mono text-[14px] text-provost-text-primary tracking-[-0.42px]">
                      {a.tool_name}
                    </h3>
                  </div>
                  <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                    Decided by {a.decider?.name ?? "—"} ·{" "}
                    {a.decided_at ? new Date(a.decided_at).toLocaleString() : "—"}
                  </p>
                  <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
                    Requested by {a.requester?.name ?? "—"}
                  </p>
                </div>
                <Link
                  href={`/governance/audit?search=${a.thread_run_id}`}
                  className="text-[13px] text-provost-text-secondary tracking-[-0.39px] underline hover:text-provost-text-primary"
                >
                  Context
                </Link>
              </div>
              {a.decision_reason && (
                <p className="rounded-[8px] bg-provost-bg-muted p-2 text-[13px] text-provost-text-primary tracking-[-0.39px]">
                  Reason: {a.decision_reason}
                </p>
              )}
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
