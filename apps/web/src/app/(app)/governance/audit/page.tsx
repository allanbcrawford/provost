"use client";

import { useSelectedFamily } from "@/context/family-context";
import { AuditLog } from "@/features/governance/audit-log";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function GovernanceAuditPage() {
  const family = useSelectedFamily();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-neutral-200 border-b px-6 pt-8 pb-4">
        <h1 className="font-semibold text-2xl text-provost-text-primary">Audit log</h1>
        <p className="mt-1 text-provost-text-secondary text-sm">
          All mutations, tool calls, runs, auth, and approvals for this family.
        </p>
      </header>
      <div className="p-6">
        {!family ? (
          <div className="text-provost-text-secondary text-sm">Select a family to continue.</div>
        ) : (
          <AuditLog familyId={family._id} />
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(GovernanceAuditPage, APP_ROLES.GOVERNANCE!);
