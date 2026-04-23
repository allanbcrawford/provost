"use client";

import { Button } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function ApprovalsQueue({ familyId }: { familyId: Id<"families"> }) {
  const pending = useQuery(api.governance.pendingApprovals, { familyId });
  const approve = useMutation(api.agent.approvals.approve);
  const reject = useMutation(api.agent.approvals.reject);
  const [busy, setBusy] = useState<string | null>(null);

  async function onApprove(toolCallId: string) {
    setBusy(toolCallId);
    try {
      await approve({ toolCallId });
    } finally {
      setBusy(null);
    }
  }

  async function onReject(toolCallId: string) {
    setBusy(toolCallId);
    try {
      await reject({ toolCallId });
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
    <ul className="flex flex-col gap-3">
      {pending.map((a) => (
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
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(a.tool_call_id)}
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
          <pre className="overflow-x-auto rounded bg-neutral-50 p-3 text-neutral-700 text-xs">
            {JSON.stringify(a.arguments, null, 2)}
          </pre>
        </li>
      ))}
    </ul>
  );
}
