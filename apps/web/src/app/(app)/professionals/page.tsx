"use client";

import { ProfessionalsList } from "@/features/professionals/professionals-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function ProfessionalsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-neutral-200 border-b px-6 pt-8 pb-4">
        <h1 className="font-semibold text-2xl text-provost-text-primary">Professionals</h1>
        <p className="mt-1 text-provost-text-secondary text-sm">
          Directory of advisors, attorneys, and accountants available to your family office.
        </p>
      </header>
      <ProfessionalsList />
    </div>
  );
}

export default withRoleGuard(ProfessionalsPage, APP_ROLES.PROFESSIONALS ?? []);
