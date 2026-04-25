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
    return <div className="py-8 text-provost-text-secondary text-sm">Loading…</div>;
  }

  return (
    <div className="flex flex-col">
      <DocumentsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-provost-text-secondary text-sm">
          No documents in this category yet.
        </div>
      ) : (
        <div className="flex flex-col gap-16 py-8">
          {filtered.map((d: Doc<"documents">, index: number) => (
            <div key={d._id} className="relative">
              <DocumentItem document={d} />
              {index < filtered.length - 1 && (
                <div className="absolute right-0 -bottom-8 left-0 h-px bg-[#E5E7EB]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
