"use client";

import { useMemo, useState } from "react";
import { formatDate, formatName, shortName } from "@/features/graph/format";
import type {
  Document,
  GraphPayload,
  Member,
  Professional,
  SelectedNode,
  Signal,
  SignalCategory,
  SignalSeverity,
} from "@/features/graph/types";
import { usePageContext } from "@/hooks/use-page-context";

type Props = {
  selected: SelectedNode;
  payload: GraphPayload;
  sentIds: Set<string>;
  onClose: () => void;
  onFocus: (sel: SelectedNode) => void;
  onDraftRevision: (signalId: string) => void;
  onShowInGraph: (signalId: string) => void;
  activeHighlightSignalId: string | null;
};

const SEV_COLOR: Record<SignalSeverity, { text: string; bg: string; dot: string }> = {
  missing: {
    text: "text-provost-gap-missing",
    bg: "bg-provost-gap-missing-bg",
    dot: "bg-provost-gap-missing",
  },
  review: {
    text: "text-provost-gap-review",
    bg: "bg-provost-gap-review-bg",
    dot: "bg-provost-gap-review",
  },
  stale: {
    text: "text-provost-gap-stale",
    bg: "bg-provost-gap-stale-bg",
    dot: "bg-provost-gap-stale",
  },
};

const CAT_LABEL: Record<SignalCategory, string> = {
  missing: "Missing",
  conflict: "Conflict",
  risk: "Risk",
  recommendation: "Recommendation",
};

function signalsForSelection(selected: SelectedNode, payload: GraphPayload): Signal[] {
  if (!selected) return [];
  if (selected.kind === "member") {
    return payload.signals.filter((s) => s.memberIds.includes(selected.id));
  }
  if (selected.kind === "document") {
    return payload.signals.filter((s) => s.relatedDocumentId === selected.id);
  }
  if (selected.kind === "signal") {
    const sig = payload.signals.find((s) => s.id === selected.id);
    return sig ? [sig] : [];
  }
  if (selected.kind === "professional") {
    return payload.signals.filter((s) => s.suggestedProfessionalId === selected.id);
  }
  return [];
}

export function DetailPanel({
  selected,
  payload,
  sentIds,
  onClose,
  onFocus,
  onDraftRevision,
  onShowInGraph,
  activeHighlightSignalId,
}: Props) {
  const [tab, setTab] = useState<"detail" | "signals">("detail");

  // Map the graph node selection onto the chat agent's selection schema.
  // member -> family_member, signal -> signal, document -> document,
  // professional -> professional. visibleState carries the active tab so
  // the agent knows whether the user is looking at details or signals.
  const pageSelection = useMemo(() => {
    if (!selected) return null;
    const kind =
      selected.kind === "member"
        ? "family_member"
        : selected.kind === "signal"
          ? "signal"
          : selected.kind === "document"
            ? "document"
            : "professional";
    return { kind, id: selected.id };
  }, [selected]);
  usePageContext({
    selection: pageSelection,
    visibleState: selected ? { tab } : undefined,
    enabled: Boolean(selected),
  });

  if (!selected) return null;

  let detailBody: React.ReactNode = null;
  let heading = "";
  let subheading = "";

  if (selected.kind === "member") {
    const m = payload.members.find((x) => x.id === selected.id);
    if (!m) return null;
    heading = formatName(m);
    subheading = m.role === "admin" ? "Principal · Generation 1" : `Generation ${m.generation}`;
    detailBody = <MemberBody member={m} payload={payload} onFocus={onFocus} />;
  } else if (selected.kind === "document") {
    const d = payload.documents.find((x) => x.id === selected.id);
    if (!d) return null;
    heading = d.name;
    subheading = d.type;
    detailBody = <DocumentBody doc={d} payload={payload} onFocus={onFocus} />;
  } else if (selected.kind === "signal") {
    const sig = payload.signals.find((x) => x.id === selected.id);
    if (!sig) return null;
    heading = sig.title;
    subheading = `${sig.severity.toUpperCase()} · ${CAT_LABEL[sig.category]}`;
    detailBody = <SignalBody signal={sig} payload={payload} onFocus={onFocus} />;
  } else {
    const p = payload.professionals.find((x) => x.id === selected.id);
    if (!p) return null;
    heading = p.name;
    subheading = `${p.profession} · ${p.firm}`;
    detailBody = <ProfessionalBody pro={p} payload={payload} onFocus={onFocus} />;
  }

  const scopedSignals = signalsForSelection(selected, payload);
  const openSignalCount = scopedSignals.filter((s) => !sentIds.has(s.id)).length;

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-provost-border-subtle border-l bg-white">
      <div className="flex items-start justify-between gap-3 border-provost-border-subtle border-b px-5 py-4">
        <div className="min-w-0">
          <p className="font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
            {subheading}
          </p>
          <h2 className="mt-0.5 font-dm-serif text-[20px] text-provost-text-primary leading-tight">
            {heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-md text-provost-text-secondary hover:bg-provost-bg-muted"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="flex items-center gap-1 border-provost-border-subtle border-b px-3 pt-2">
        <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
          Detail
        </TabButton>
        <TabButton
          active={tab === "signals"}
          onClick={() => setTab("signals")}
          badge={openSignalCount}
        >
          Signals
        </TabButton>
      </div>

      {tab === "signals" ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SignalsTab
            signals={scopedSignals}
            sentIds={sentIds}
            payload={payload}
            onFocus={onFocus}
            onDraftRevision={onDraftRevision}
            onShowInGraph={onShowInGraph}
            activeHighlightSignalId={activeHighlightSignalId}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 text-[13px] text-provost-text-primary">
          {openSignalCount > 0 && (
            <button
              type="button"
              onClick={() => setTab("signals")}
              className="mb-4 flex w-full items-center gap-2 rounded-[10px] border border-provost-gap-review bg-provost-gap-review-bg px-3 py-2 text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-provost-gap-review">
                bolt
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-[12.5px] text-provost-text-primary">
                  {openSignalCount} signal{openSignalCount === 1 ? "" : "s"} affect this node
                </span>
                <span className="block text-[11.5px] text-provost-text-secondary">
                  Review in Signals tab →
                </span>
              </span>
            </button>
          )}
          {detailBody}
        </div>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-[13px] transition-colors",
        active
          ? "text-provost-text-primary"
          : "text-provost-text-secondary hover:text-provost-text-primary",
      ].join(" ")}
    >
      <span>{children}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-provost-gap-missing px-1.5 font-semibold text-[10.5px] text-white">
          {badge}
        </span>
      )}
      <span
        aria-hidden
        className={[
          "absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full",
          active ? "bg-provost-text-primary" : "bg-transparent",
        ].join(" ")}
      />
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <p className="mb-1.5 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
        {label}
      </p>
      {children}
    </section>
  );
}

function RowButton({
  onClick,
  icon,
  title,
  subtitle,
  trailing,
}: {
  onClick: () => void;
  icon: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-[8px] border border-transparent px-2 py-2 text-left hover:border-provost-border-subtle hover:bg-provost-bg-muted"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-provost-bg-subtle text-provost-text-secondary">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[13px] text-provost-text-primary">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-[11.5px] text-provost-text-secondary">
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}

function MemberBody({
  member,
  payload,
  onFocus,
}: {
  member: Member;
  payload: GraphPayload;
  onFocus: (sel: SelectedNode) => void;
}) {
  const docIds = new Set(
    payload.memberDocLinks.filter((l) => l.memberId === member.id).map((l) => l.documentId),
  );
  const docs = payload.documents.filter((d) => docIds.has(d.id));

  return (
    <>
      <Section label="Details">
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[12.5px]">
          <dt className="text-provost-text-secondary">Born</dt>
          <dd>{member.date_of_birth ? formatDate(member.date_of_birth) : "—"}</dd>
          <dt className="text-provost-text-secondary">Location</dt>
          <dd>{member.home_location || "—"}</dd>
          <dt className="text-provost-text-secondary">Education</dt>
          <dd>{member.education || "—"}</dd>
          <dt className="text-provost-text-secondary">Learning</dt>
          <dd>{member.learning_path ?? "—"}</dd>
        </dl>
      </Section>

      <Section label={`Linked documents · ${docs.length}`}>
        {docs.length === 0 ? (
          <p className="text-[12.5px] text-provost-text-secondary">
            No documents reference this member.
          </p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id}>
                <RowButton
                  onClick={() => onFocus({ kind: "document", id: d.id })}
                  icon="description"
                  title={d.name}
                  subtitle={d.type}
                  trailing={
                    d.observation?.type === "danger" ? (
                      <span
                        className="block size-2 rounded-full bg-provost-gap-missing"
                        title="flagged"
                      />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function DocumentBody({
  doc,
  payload,
  onFocus,
}: {
  doc: Document;
  payload: GraphPayload;
  onFocus: (sel: SelectedNode) => void;
}) {
  const memberIds = new Set(
    payload.memberDocLinks.filter((l) => l.documentId === doc.id).map((l) => l.memberId),
  );
  const members = payload.members.filter((m) => memberIds.has(m.id));
  const proId = payload.docProfLinks.find((l) => l.documentId === doc.id)?.professionalId;
  const pro = payload.professionals.find((p) => p.id === proId);

  return (
    <>
      <Section label="Summary">
        <p className="text-[12.5px] text-provost-text-primary leading-relaxed">{doc.summary}</p>
      </Section>
      <Section label="Meta">
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[12.5px]">
          <dt className="text-provost-text-secondary">Category</dt>
          <dd className="capitalize">{doc.category.replace(/_/g, " ")}</dd>
          <dt className="text-provost-text-secondary">Type</dt>
          <dd>{doc.type}</dd>
          <dt className="text-provost-text-secondary">Creator</dt>
          <dd>{doc.creator_name}</dd>
          <dt className="text-provost-text-secondary">File</dt>
          <dd className="truncate">{doc.file_name}</dd>
          <dt className="text-provost-text-secondary">Status</dt>
          <dd>
            {doc.observation?.type === "danger" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-provost-gap-missing-bg px-1.5 py-0.5 font-medium text-[11px] text-provost-gap-missing">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                Flagged for review
              </span>
            ) : (
              <span className="text-provost-text-secondary">On file</span>
            )}
          </dd>
        </dl>
      </Section>

      <Section label={`Referenced members · ${members.length}`}>
        {members.length === 0 ? (
          <p className="text-[12.5px] text-provost-text-secondary">
            No member names detected in this document.
          </p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id}>
                <RowButton
                  onClick={() => onFocus({ kind: "member", id: m.id })}
                  icon="person"
                  title={formatName(m)}
                  subtitle={m.role === "admin" ? "Principal · Gen 1" : `Gen ${m.generation}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Drafted by">
        {pro ? (
          <RowButton
            onClick={() => onFocus({ kind: "professional", id: pro.id })}
            icon="work"
            title={pro.name}
            subtitle={`${pro.profession} · ${pro.firm}`}
          />
        ) : (
          <p className="text-[12.5px] text-provost-text-secondary">No professional assigned.</p>
        )}
      </Section>
    </>
  );
}

function SignalBody({
  signal,
  payload,
  onFocus,
}: {
  signal: Signal;
  payload: GraphPayload;
  onFocus: (sel: SelectedNode) => void;
}) {
  const members = payload.members.filter((m) => signal.memberIds.includes(m.id));
  const pro = payload.professionals.find((p) => p.id === signal.suggestedProfessionalId);
  const relatedDoc = signal.relatedDocumentId
    ? payload.documents.find((d) => d.id === signal.relatedDocumentId)
    : undefined;

  return (
    <>
      <Section label="Why this was flagged">
        <p className="text-[12.5px] text-provost-text-primary leading-relaxed">{signal.reason}</p>
      </Section>

      {signal.suggestedAction && (
        <Section label="Suggested action">
          <p className="text-[12.5px] text-provost-text-primary leading-relaxed">
            {signal.suggestedAction}
          </p>
        </Section>
      )}

      {relatedDoc && (
        <Section label="Related document">
          <RowButton
            onClick={() => onFocus({ kind: "document", id: relatedDoc.id })}
            icon="description"
            title={relatedDoc.name}
            subtitle={relatedDoc.type}
          />
        </Section>
      )}

      <Section label={`Affects · ${members.length}`}>
        {members.length === 0 ? (
          <p className="text-[12.5px] text-provost-text-secondary">
            No member is directly attached.
          </p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id}>
                <RowButton
                  onClick={() => onFocus({ kind: "member", id: m.id })}
                  icon="person"
                  title={formatName(m)}
                  subtitle={`Gen ${m.generation}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {pro && (
        <Section label="Recommended owner">
          <button
            type="button"
            onClick={() => {
              console.info("[Assign signal]", { signalId: signal.id, professionalId: pro.id });
            }}
            className="flex w-full items-center justify-between gap-2 rounded-[10px] bg-provost-accent-blue px-3 py-2.5 font-medium text-[13px] text-white hover:bg-provost-accent-blue-hover"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
              Assign to {pro.name}
            </span>
            <span className="text-[11.5px] text-white/80">{pro.profession}</span>
          </button>
        </Section>
      )}
    </>
  );
}

function ProfessionalBody({
  pro,
  payload,
  onFocus,
}: {
  pro: Professional;
  payload: GraphPayload;
  onFocus: (sel: SelectedNode) => void;
}) {
  const docIds = new Set(
    payload.docProfLinks.filter((l) => l.professionalId === pro.id).map((l) => l.documentId),
  );
  const drafted = payload.documents.filter((d) => docIds.has(d.id));
  const flagged = drafted.filter((d) => d.observation?.type === "danger");
  const recommendedSignals = payload.signals.filter((g) => g.suggestedProfessionalId === pro.id);

  return (
    <>
      <Section label="Contact">
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[12.5px]">
          <dt className="text-provost-text-secondary">Firm</dt>
          <dd>{pro.firm}</dd>
          <dt className="text-provost-text-secondary">Email</dt>
          <dd className="truncate">{pro.email}</dd>
        </dl>
      </Section>

      <Section label={`Drafted documents · ${drafted.length}`}>
        <ul className="space-y-1">
          {drafted.map((d) => (
            <li key={d.id}>
              <RowButton
                onClick={() => onFocus({ kind: "document", id: d.id })}
                icon="description"
                title={d.name}
                subtitle={d.type}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section label={`Review queue · ${flagged.length + recommendedSignals.length}`}>
        {flagged.length === 0 && recommendedSignals.length === 0 ? (
          <p className="text-[12.5px] text-provost-text-secondary">Nothing in the queue.</p>
        ) : (
          <ul className="space-y-1">
            {flagged.map((d) => (
              <li key={`f-${d.id}`}>
                <RowButton
                  onClick={() => onFocus({ kind: "document", id: d.id })}
                  icon="warning"
                  title={d.name}
                  subtitle="Flagged document"
                />
              </li>
            ))}
            {recommendedSignals.map((g) => (
              <li key={`g-${g.id}`}>
                <RowButton
                  onClick={() => onFocus({ kind: "signal", id: g.id })}
                  icon={g.severity === "missing" ? "error" : "history"}
                  title={g.title}
                  subtitle={`Affects ${g.memberIds.length || "—"} ${g.memberIds.length === 1 ? "member" : "members"}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(() => {
        const firstSig = recommendedSignals[0];
        const fallback = payload.members[0];
        if (!firstSig || !fallback) return null;
        const firstMemberId = firstSig.memberIds[0];
        const member = firstMemberId
          ? (payload.members.find((m) => m.id === firstMemberId) ?? fallback)
          : fallback;
        return (
          <p className="text-[11.5px] text-provost-text-tertiary">
            Suggested next step: review {shortName(member)}'s coverage.
          </p>
        );
      })()}
    </>
  );
}

function SignalsTab({
  signals,
  sentIds,
  payload,
  onFocus,
  onDraftRevision,
  onShowInGraph,
  activeHighlightSignalId,
}: {
  signals: Signal[];
  sentIds: Set<string>;
  payload: GraphPayload;
  onFocus: (sel: SelectedNode) => void;
  onDraftRevision: (signalId: string) => void;
  onShowInGraph: (signalId: string) => void;
  activeHighlightSignalId: string | null;
}) {
  if (signals.length === 0) {
    return (
      <p className="py-6 text-center text-[12.5px] text-provost-text-secondary">
        No signals affect this node.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {signals.map((s) => (
        <SignalCard
          key={s.id}
          signal={s}
          isSent={sentIds.has(s.id)}
          payload={payload}
          isHighlighted={s.id === activeHighlightSignalId}
          onFocus={onFocus}
          onDraftRevision={onDraftRevision}
          onShowInGraph={onShowInGraph}
        />
      ))}
    </ul>
  );
}

function SignalCard({
  signal,
  isSent,
  payload,
  isHighlighted,
  onFocus,
  onDraftRevision,
  onShowInGraph,
}: {
  signal: Signal;
  isSent: boolean;
  payload: GraphPayload;
  isHighlighted: boolean;
  onFocus: (sel: SelectedNode) => void;
  onDraftRevision: (signalId: string) => void;
  onShowInGraph: (signalId: string) => void;
}) {
  const sev = SEV_COLOR[signal.severity];
  const members = payload.members.filter((m) => signal.memberIds.includes(m.id));
  const relatedDoc = signal.relatedDocumentId
    ? payload.documents.find((d) => d.id === signal.relatedDocumentId)
    : undefined;
  const pro = payload.professionals.find((p) => p.id === signal.suggestedProfessionalId);

  return (
    <li
      className={[
        "rounded-[12px] border bg-white p-3",
        isHighlighted
          ? "border-provost-gap-review ring-2 ring-provost-gap-review-bg"
          : "border-provost-border-subtle",
      ].join(" ")}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wide ${sev.bg} ${sev.text}`}
        >
          <span className={`size-1.5 rounded-full ${sev.dot}`} />
          {CAT_LABEL[signal.category]}
        </span>
        <span className={`font-semibold text-[10px] uppercase tracking-wide ${sev.text}`}>
          {signal.severity}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onFocus({ kind: "signal", id: signal.id })}
        className="block w-full text-left font-medium text-[13px] text-provost-text-primary leading-snug hover:underline"
      >
        {signal.title}
      </button>
      <p className="mt-1 text-[12px] text-provost-text-secondary leading-relaxed">
        {signal.reason}
      </p>

      {(members.length > 0 || relatedDoc) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {relatedDoc && (
            <button
              key={`d-${relatedDoc.id}`}
              type="button"
              onClick={() => onFocus({ kind: "document", id: relatedDoc.id })}
              className="inline-flex items-center gap-1 rounded-full border border-provost-border-subtle bg-provost-bg-muted px-2 py-0.5 text-[11px] text-provost-text-primary hover:border-provost-accent-blue"
            >
              <span className="material-symbols-outlined text-[12px]">description</span>
              <span className="max-w-[140px] truncate">{relatedDoc.name}</span>
            </button>
          )}
          {members.map((m) => (
            <button
              key={`m-${m.id}`}
              type="button"
              onClick={() => onFocus({ kind: "member", id: m.id })}
              className="inline-flex items-center gap-1 rounded-full border border-provost-border-subtle bg-provost-bg-muted px-2 py-0.5 text-[11px] text-provost-text-primary hover:border-provost-accent-blue"
            >
              <span className="material-symbols-outlined text-[12px]">person</span>
              {shortName(m)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onShowInGraph(signal.id)}
          className={[
            "inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 font-medium text-[11.5px]",
            isHighlighted
              ? "border-provost-gap-review bg-provost-gap-review-bg text-provost-gap-review"
              : "border-provost-border-subtle text-provost-text-secondary hover:bg-provost-bg-muted",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[14px]">hub</span>
          {isHighlighted ? "Showing" : "Show in graph"}
        </button>
        {isSent ? (
          <span className="inline-flex items-center gap-1 rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-2.5 py-1 font-medium text-[11.5px] text-provost-text-secondary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Sent to planner
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onDraftRevision(signal.id)}
            className="inline-flex items-center gap-1 rounded-[8px] bg-provost-text-primary px-2.5 py-1 font-medium text-[11.5px] text-white hover:bg-black"
          >
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            Draft revision →
          </button>
        )}
        {pro && !isSent && (
          <span className="ml-auto truncate text-[10.5px] text-provost-text-tertiary">
            {pro.name}
          </span>
        )}
      </div>
    </li>
  );
}
