"use client";

import { ProfessionalsList } from "@/features/professionals/professionals-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function ProfessionalsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Professionals
        </h1>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Directory of advisors, attorneys, and accountants available to your family office.
        </p>
      </div>
      <ProfessionalsList />
    </div>
  );
}

export default withRoleGuard(ProfessionalsPage, APP_ROLES.PROFESSIONALS ?? []);
