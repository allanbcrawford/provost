"use client";

// Advisor / family-admin queue for AI-generated signals that haven't yet
// been reviewed. Approves push the signal into the family-member view;
// dismisses keep it out and write an audit row with the reason.

import { Button } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

function SignalsQueuePage() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const pending = useQuery(api.signals.listPendingReview, familyId ? { familyId } : "skip");
  const approve = useMutation(api.signals.approveSignal);
  const dismiss = useMutation(api.signals.dismissSignal);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  async function handleApprove(signalId: Id<"signals">) {
    try {
      setBusy(signalId);
      await approve({ signalId });
    } finally {
      setBusy(null);
    }
  }

  async function handleDismiss(signalId: Id<"signals">) {
    try {
      setBusy(signalId);
      await dismiss({ signalId, reason: reasonText.trim() || undefined });
    } finally {
      setBusy(null);
      setReasonFor(null);
      setReasonText("");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <header>
        <h1 className="font-dm-serif text-[36px] text-provost-text-primary tracking-[-0.72px]">
          Signal review queue
        </h1>
        <p className="mt-1 text-[14px] text-provost-text-secondary">
          AI-generated observations awaiting advisor review. Approve to surface to family members;
          dismiss to keep them out of view.
        </p>
      </header>

      {pending === undefined ? (
        <p className="text-[14px] text-provost-text-secondary">Loading…</p>
      ) : pending.length === 0 ? (
        <div className="rounded-md border border-provost-border-subtle bg-white p-8 text-center text-[14px] text-provost-text-secondary">
          No signals waiting for review.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((s) => (
            <li key={s._id} className="rounded-md border border-provost-border-subtle bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[16px] text-provost-text-primary">{s.title}</p>
                  <p className="mt-1 text-[13px] text-provost-text-secondary">
                    <span className="capitalize">{s.severity}</span> · {s.category} · {s.source}
                  </p>
                  <p className="mt-2 text-[14px] text-provost-text-primary">{s.reason}</p>
                  {s.suggested_action && (
                    <p className="mt-2 text-[13px] text-provost-text-secondary">
                      Suggested: {s.suggested_action}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApprove(s._id)}
                    disabled={busy === s._id}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReasonFor(s._id);
                      setReasonText("");
                    }}
                    disabled={busy === s._id}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              {reasonFor === s._id && (
                <div className="mt-3 border-provost-border-subtle border-t pt-3">
                  <label className="text-[12px] text-provost-text-secondary" htmlFor="reason">
                    Reason (optional)
                  </label>
                  <textarea
                    id="reason"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-provost-border-subtle bg-white px-2 py-1.5 text-[13px]"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReasonFor(null);
                        setReasonText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDismiss(s._id)}
                      disabled={busy === s._id}
                    >
                      Confirm dismiss
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default withRoleGuard(SignalsQueuePage, APP_ROLES.SIGNALS ?? []);
