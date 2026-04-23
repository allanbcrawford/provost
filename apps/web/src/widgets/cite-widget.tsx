"use client";

import Link from "next/link";

export type CiteCitation = {
  page: number;
  snippet: string;
};

export type CiteWidgetProps = {
  documentId: string;
  page?: number | null;
  explanation: string;
  citations: CiteCitation[];
};

function renderInlineCitations(text: string): React.ReactNode[] {
  const re = /\[p\.(\d+)\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  match = re.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <span
        key={`c-${key++}`}
        className="rounded bg-provost-bg-muted px-1 text-[11px] font-semibold text-provost-text-primary"
      >
        p.{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
    match = re.exec(text);
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function CiteWidget({ documentId, page, explanation, citations }: CiteWidgetProps) {
  const paragraphs = explanation.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-provost-text-tertiary">
        Document explanation{typeof page === "number" ? ` · page ${page}` : ""}
      </div>
      <div className="space-y-2 whitespace-pre-wrap text-provost-text-primary">
        {paragraphs.map((para, i) => (
          <p key={i}>{renderInlineCitations(para)}</p>
        ))}
      </div>
      {citations.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-provost-border-subtle pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-provost-text-tertiary">
            Citations
          </div>
          {citations.map((c) => (
            <div key={c.page} className="flex items-start gap-2">
              <Link
                href={`/documents/${documentId}?page=${c.page}`}
                className="shrink-0 rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2 py-0.5 text-[11px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
              >
                View p.{c.page}
              </Link>
              <span className="text-[12px] text-provost-text-secondary">{c.snippet}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
