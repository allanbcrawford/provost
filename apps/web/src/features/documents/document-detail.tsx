"use client";

import { Button } from "@provost/ui";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

const PDFViewer = dynamic(() => import("@provost/ui/pdf").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <div className="p-4 text-provost-text-secondary text-sm">Loading PDF…</div>,
});

import { usePageContext } from "@/hooks/use-page-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ObservationsPanel } from "./observations-panel";

type DocumentDetailProps = {
  documentId: Id<"documents">;
};

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const document = useQuery(api.documents.get, { documentId });
  const pages = useQuery(api.documents.listPages, { documentId });
  const versions = useQuery(api.documents.listVersions, { documentId });
  const [page, setPage] = useState(1);

  // Surface what the user is viewing to the chat agent. The doc name/type
  // make follow-up questions like "summarize this" actionable without
  // requiring the user to repeat context.
  usePageContext({
    selection: { kind: "document", id: documentId },
    visibleState: document
      ? {
          documentName: document.name,
          documentType: document.type,
          page,
          pageCount: pages?.length ?? 0,
        }
      : { page },
    enabled: document !== null,
  });

  useEffect(() => {
    import("@provost/ui/pdf").then((m) => m.setupPdfWorker());
  }, []);

  if (document === undefined) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading…</div>;
  }
  if (document === null) {
    return <div className="p-8 text-provost-text-secondary text-sm">Document not found.</div>;
  }

  const pageCount = pages?.length ?? 0;
  const hasPdf = Boolean(document.fileUrl);

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Button asChild size="sm" variant="ghost" className="mb-3 -ml-2">
            <Link href="/documents">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Library
            </Link>
          </Button>
          <h1 className="truncate font-dm-serif font-medium text-[36px] text-provost-text-primary leading-[1.2] tracking-[-0.72px]">
            {document.name}
          </h1>
          <p className="mt-1 text-[13px] text-provost-text-secondary">
            <span className="capitalize">{document.type}</span>
            {document.creator_name ? `  ·  By ${document.creator_name}` : ""}
          </p>
          {versions && versions.length > 1 && (
            <div className="mt-2 flex items-center gap-2 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
              <span>Version</span>
              <select
                value={documentId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && next !== documentId) {
                    window.location.href = `/documents/${next}`;
                  }
                }}
                className="rounded-md border border-provost-border-default bg-white px-2 py-1 text-[13px] text-provost-text-primary"
              >
                {versions.map((v) => {
                  const label = v.version_date
                    ? new Date(v.version_date).toLocaleDateString()
                    : "(undated)";
                  return (
                    <option key={v._id} value={v._id}>
                      {label}
                      {v.is_current ? " — current" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {document.summary && (
            <p className="mt-2 max-w-3xl text-[15px] text-provost-text-secondary tracking-[-0.4px]">
              {document.summary}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 h-px bg-[#E5E7EB]" />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-0 flex-col rounded-md border border-provost-border-default bg-neutral-50">
          {hasPdf ? (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                {document.fileUrl && (
                  <PDFViewer fileUrl={document.fileUrl} page={page} onPageChange={setPage} />
                )}
              </div>
              {pageCount > 0 && (
                <div className="flex items-center justify-between border-provost-border-default border-t px-3 py-2 text-provost-text-secondary text-xs">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <span>
                    Page {page} of {pageCount}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-provost-text-secondary text-sm">
              No PDF attached to this document.
            </div>
          )}
        </div>

        <ObservationsPanel familyId={document.family_id} documentId={document._id} />
      </div>
    </div>
  );
}
