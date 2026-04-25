"use client";

import { useParams } from "next/navigation";
import { DocumentDetail } from "@/features/documents";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

function DocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params?.documentId as Id<"documents"> | undefined;

  if (!documentId) {
    return <div className="p-8 text-provost-text-secondary text-sm">Missing document id.</div>;
  }

  return <DocumentDetail documentId={documentId} />;
}

export default withRoleGuard(DocumentDetailPage, APP_ROLES.DOCUMENTS ?? []);
