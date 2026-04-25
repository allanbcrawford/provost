"use client";

import type { Doc } from "../../../../../convex/_generated/dataModel";

type WaterfallStateBranch = {
  when: string;
  distributions: Array<{
    beneficiaryId: string;
    share: number;
    assetFilter?: { types?: string[]; assetIds?: string[] };
  }>;
};

type WaterfallStateLike = {
  priority_class?: number;
  branches?: WaterfallStateBranch[];
  residuary?: { beneficiaryId: string };
};

type Page = Doc<"pages">;

type Props = {
  document: Doc<"documents"> & { fileUrl?: string | null };
  pages: Page[] | undefined;
};

export function DocumentOverview({ document, pages }: Props) {
  const state = (document.state ?? null) as WaterfallStateLike | null;
  const hasState = state && Array.isArray(state.branches) && state.branches.length > 0;
  const hasPages = pages && pages.length > 0;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {document.description && (
        <section>
          <SectionLabel>Description</SectionLabel>
          <p className="mt-2 whitespace-pre-wrap text-[14px] text-provost-text-primary leading-relaxed tracking-[-0.42px]">
            {document.description}
          </p>
        </section>
      )}

      {hasState && (
        <section>
          <SectionLabel>Waterfall structure</SectionLabel>
          <div className="mt-2 space-y-3">
            {state.branches?.map((branch) => (
              <BranchCard key={branch.when} branch={branch} />
            ))}
            {state.residuary && (
              <p className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                Residuary →{" "}
                <span className="font-medium text-provost-text-primary">
                  {state.residuary.beneficiaryId}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {hasPages && (
        <section>
          <SectionLabel>Document text</SectionLabel>
          <div className="mt-2 space-y-4">
            {pages.map((p) => (
              <article
                key={p._id}
                className="rounded-md border border-provost-border-default bg-white p-4"
              >
                <p className="mb-2 text-[11px] text-provost-text-tertiary uppercase tracking-wider">
                  Page {p.index + 1}
                </p>
                <div className="whitespace-pre-wrap text-[13px] text-provost-text-primary leading-relaxed">
                  {p.content}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!document.description && !hasState && !hasPages && (
        <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-provost-text-secondary">
          This document has no attached PDF or extracted text yet. Use chat to ask questions about
          its metadata, or upload a new version with a PDF.
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
      {children}
    </p>
  );
}

function BranchCard({ branch }: { branch: WaterfallStateBranch }) {
  const total = branch.distributions.reduce((sum, d) => sum + d.share, 0);
  return (
    <div className="rounded-md border border-provost-border-default bg-white p-3">
      <p className="text-[12px] text-provost-text-secondary tracking-[-0.36px]">
        If <span className="font-medium text-provost-text-primary">{labelFor(branch.when)}</span>
      </p>
      {branch.distributions.length === 0 ? (
        <p className="mt-2 text-[12px] text-provost-text-tertiary italic">
          No distributions defined for this branch.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {branch.distributions.map((d, i) => (
            <li
              key={`${d.beneficiaryId}-${i}`}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="text-provost-text-primary">{d.beneficiaryId}</span>
              <span className="text-provost-text-secondary tabular-nums">
                {Math.round(d.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {total > 0 && total < 0.999 && (
        <p className="mt-2 text-[11px] text-amber-700">
          Distributions sum to {Math.round(total * 100)}% — remainder flows through residuary.
        </p>
      )}
    </div>
  );
}

function labelFor(when: string): string {
  switch (when) {
    case "robert-first":
      return "Robert dies first";
    case "linda-first":
      return "Linda dies first";
    case "simultaneous":
      return "Simultaneous death";
    case "always":
      return "Always (no contingent path)";
    default:
      return when;
  }
}
