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
    <div className="mx-auto max-w-6xl">
      <header className="border-neutral-200 border-b px-6 pt-8 pb-4">
        <h1 className="font-semibold text-2xl text-provost-text-primary">Governance</h1>
        <p className="mt-1 text-provost-text-secondary text-sm">
          Audit log, approvals queue, tasks, and compliance settings.
        </p>
      </header>

      <div className="p-6">
        {!family ? (
          <div className="text-provost-text-secondary text-sm">Select a family to continue.</div>
        ) : (
          <Tabs defaultValue="approvals" className="flex flex-col gap-6">
            <TabsList>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
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
    </div>
  );
}

export default withRoleGuard(GovernancePage, APP_ROLES.GOVERNANCE!);
