"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { DocumentItem } from "./document-item";
import { type DocumentTab, matchesTab } from "./document-tabs-config";
import { DocumentsTabs } from "./documents-tabs";

type DocumentsListProps = {
  familyId: Id<"families">;
};

export function DocumentsList({ familyId }: DocumentsListProps) {
  const documents = useQuery(api.documents.list, { familyId });
  const [activeTab, setActiveTab] = useState<DocumentTab>("all");

  const filtered = useMemo(() => {
    if (!documents) return [];
    return (documents as Doc<"documents">[]).filter((d: Doc<"documents">) =>
      matchesTab(d.category, activeTab),
    );
  }, [documents, activeTab]);

  if (documents === undefined) {
    return <div className="p-8 text-sm text-provost-text-secondary">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <DocumentsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-provost-text-secondary">
          No documents in this category yet.
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((d: Doc<"documents">) => (
            <DocumentItem key={d._id} document={d} />
          ))}
        </div>
      )}
    </div>
  );
}
