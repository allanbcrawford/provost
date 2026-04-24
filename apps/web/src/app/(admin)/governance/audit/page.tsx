"use client";

import { useState } from "react";
import { AdminFamilyPicker } from "@/components/admin-family-picker";
import { AuditLog } from "@/features/governance/audit-log";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function AdminGovernanceAuditPage() {
  const [familyId, setFamilyId] = useState<Id<"families"> | null>(null);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Audit log
        </h1>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          All mutations, tool calls, runs, auth, and approvals for the selected family.
        </p>
      </div>
      <AdminFamilyPicker value={familyId} onChange={setFamilyId} />
      {!familyId ? (
        <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Select a family to continue.
        </div>
      ) : (
        <AuditLog familyId={familyId} />
      )}
    </div>
  );
}
