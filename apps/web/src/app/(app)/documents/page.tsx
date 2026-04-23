"use client";

import { Button } from "@provost/ui";
import { useFamily } from "@/context/family-context";
import { DocumentsList } from "@/features/documents";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

function DocumentsPage() {
  const { family } = useFamily();

  if (!family) {
    return <div className="p-8 text-sm text-provost-text-secondary">Loading family…</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-provost-text-primary">Library</h1>
        <Button size="sm" variant="outline" disabled>
          Add new document
        </Button>
      </div>
      <DocumentsList familyId={family._id} />
    </div>
  );
}

export default withRoleGuard(DocumentsPage, APP_ROLES.DOCUMENTS!);
