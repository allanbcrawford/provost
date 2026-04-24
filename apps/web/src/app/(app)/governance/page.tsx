"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useSelectedFamily } from "@/context/family-context";
import { ApprovalsQueue } from "@/features/governance/approvals-queue";
import { AuditLog } from "@/features/governance/audit-log";
import { ComplianceSettings } from "@/features/governance/compliance-settings";
import { TasksList } from "@/features/governance/tasks-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function GovernancePage() {
  const family = useSelectedFamily();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Governance
        </h1>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Audit log, approvals queue, tasks, and compliance settings.
        </p>
      </div>

      {!family ? (
        <div className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Select a family to continue.
        </div>
      ) : (
        <Tabs defaultValue="audit" className="flex flex-col gap-6">
          <TabsList>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="audit">
            <AuditLog familyId={family._id} />
          </TabsContent>
          <TabsContent value="approvals">
            <ApprovalsQueue familyId={family._id} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksList familyId={family._id} />
          </TabsContent>
          <TabsContent value="settings">
            <ComplianceSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default withRoleGuard(GovernancePage, APP_ROLES.GOVERNANCE!);
