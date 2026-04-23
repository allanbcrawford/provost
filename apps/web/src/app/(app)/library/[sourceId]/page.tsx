"use client";

import { use } from "react";
import { SourceDetail } from "@/features/library";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

function LibrarySourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  return <SourceDetail sourceId={sourceId as Id<"library_sources">} />;
}

export default withRoleGuard(LibrarySourcePage, APP_ROLES.LIBRARY ?? []);
