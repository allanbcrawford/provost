"use client";

import { use } from "react";
import { SourceDetail } from "@/features/library";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function AdminLibrarySourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = use(params);
  return <SourceDetail sourceId={sourceId as Id<"library_sources">} />;
}
