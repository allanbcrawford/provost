"use client";

import { Button } from "@provost/ui";
import { useFamily } from "@/context/family-context";
import { DocumentsList } from "@/features/documents";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function DocumentsPage() {
  const { family } = useFamily();

  if (!family) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading family…</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Library
        </h1>
        <Button
          size="sm"
          variant="outline"
          disabled
          className="h-[35px] rounded-full px-5 text-[15px]"
        >
          Add new document
        </Button>
      </div>
      <DocumentsList familyId={family._id} />
    </div>
  );
}

export default withRoleGuard(DocumentsPage, APP_ROLES.DOCUMENTS ?? []);
