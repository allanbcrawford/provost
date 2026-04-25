"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { InternalList } from "@/features/professionals/internal-list";
import { ProfessionalsList } from "@/features/professionals/professionals-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function ProfessionalsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Our Team
        </h1>
        <p className="mt-2 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
          People who serve the family — internal staff and external professionals.
        </p>
      </div>

      <Tabs defaultValue="external" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>
        <TabsContent value="internal">
          <InternalList />
        </TabsContent>
        <TabsContent value="external">
          <ProfessionalsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withRoleGuard(ProfessionalsPage, APP_ROLES.PROFESSIONALS ?? []);
