"use client";

import { useSelectedFamily } from "@/context/family-context";
import { AuditLog } from "@/features/governance/audit-log";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function GovernanceAuditPage() {
  const family = useSelectedFamily();
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Audit log
        </h1>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          All mutations, tool calls, runs, auth, and approvals for this family.
        </p>
      </div>
      {!family ? (
        <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Select a family to continue.
        </div>
      ) : (
        <AuditLog familyId={family._id} />
      )}
    </div>
  );
}

export default withRoleGuard(GovernanceAuditPage, APP_ROLES.GOVERNANCE!);
