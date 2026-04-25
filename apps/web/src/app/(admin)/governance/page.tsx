"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useState } from "react";
import { AdminFamilyPicker } from "@/components/admin-family-picker";
import { ApprovalsQueue } from "@/features/governance/approvals-queue";
import { AuditLog } from "@/features/governance/audit-log";
import { ComplianceSettings } from "@/features/governance/compliance-settings";
import { TasksList } from "@/features/governance/tasks-list";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function AdminGovernancePage() {
  const [familyId, setFamilyId] = useState<Id<"families"> | null>(null);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Governance
        </h1>
        <p className="mt-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
          Audit log, approvals queue, tasks, and compliance settings per family.
        </p>
      </div>

      <AdminFamilyPicker value={familyId} onChange={setFamilyId} />

      {!familyId ? (
        <div className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">
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
            <AuditLog familyId={familyId} />
          </TabsContent>
          <TabsContent value="approvals">
            <ApprovalsQueue familyId={familyId} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksList familyId={familyId} />
          </TabsContent>
          <TabsContent value="settings">
            <ComplianceSettings familyId={familyId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
