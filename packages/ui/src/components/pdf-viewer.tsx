"use client";

import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

let workerConfigured = false;

export function setupPdfWorker(workerSrc?: string) {
  if (workerConfigured) return;
  pdfjs.GlobalWorkerOptions.workerSrc =
    workerSrc ?? new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  workerConfigured = true;
}

export function isPdfSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof Worker !== "undefined" && typeof Promise !== "undefined";
  } catch {
    return false;
  }
}

type PDFViewerProps = {
  fileUrl: string;
  page?: number;
  onPageChange?: (page: number) => void;
  width?: number;
  withCredentials?: boolean;
};

const defaultOptions = { withCredentials: false };
const credentialsOptions = { withCredentials: true };

export function PDFViewer({
  fileUrl,
  page = 1,
  onPageChange,
  width = 720,
  withCredentials = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();

  const onLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      onPageChange?.(Math.min(page, n));
    },
    [page, onPageChange],
  );

  return (
    <div className="flex h-full flex-col overflow-auto">
      <Document
        file={fileUrl}
        options={withCredentials ? credentialsOptions : defaultOptions}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="p-4 text-neutral-500 text-sm">Loading PDF…</div>}
        error={<div className="p-4 text-red-500 text-sm">Failed to load PDF</div>}
      >
        {numPages ? <Page pageNumber={page} width={width} /> : null}
      </Document>
    </div>
  );
}

type PDFThumbnailsProps = {
  fileUrl: string;
  currentPage?: number;
  onSelectPage?: (page: number) => void;
  width?: number;
  withCredentials?: boolean;
};

export function PDFThumbnails({
  fileUrl,
  currentPage = 1,
  onSelectPage,
  width = 120,
  withCredentials = false,
}: PDFThumbnailsProps) {
  const [numPages, setNumPages] = useState<number>();

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      <Document
        file={fileUrl}
        options={withCredentials ? credentialsOptions : defaultOptions}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="text-neutral-500 text-xs">Loading…</div>}
        error={<div className="text-red-500 text-xs">Failed</div>}
      >
        {numPages
          ? Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={`thumb_${pageNumber}`}
                  type="button"
                  onClick={() => onSelectPage?.(pageNumber)}
                  className={`shrink-0 rounded border-2 transition ${
                    isActive ? "border-blue-500" : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={width}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </button>
              );
            })
          : null}
      </Document>
    </div>
  );
}
