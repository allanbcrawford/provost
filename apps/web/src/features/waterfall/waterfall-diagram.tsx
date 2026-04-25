"use client";

// Engine-driven waterfall diagram. Replaces the hand-coded SVG nodes with a
// column layout that reads the compute query output:
//   left column  = selected estate documents (sorted by priority)
//   right column = beneficiaries with rolled-up totals
//   edges        = engine-emitted Edge[]
//
// When no agreements are selected, the component falls back to the legacy
// "Williams" hand-illustrated layout so the simulation modal still has
// something to render in its empty state. Once the engine has at least one
// document to evaluate, the engine output is the source of truth.

import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { CustomEdits, DeathOrder, EditableNodeId, RevisionState } from "./types";

type Variant = "current" | "revised";

type Props = {
  variant: Variant;
  revisions: RevisionState;
  customEdits: CustomEdits;
  onEditNode?: (nodeId: EditableNodeId) => void;
};

const W = 560;
const H = 640;
const COLORS = {
  trustBlue: { fill: "#dbe7f3", stroke: "#2c67a0", text: "#1b3d62" },
  beneficiary: { fill: "#efe6d4", stroke: "#b3a37a", text: "#3a2f17" },
  spouseSynth: { fill: "#fbe6b8", stroke: "#c18b2c", text: "#5b3b0a" },
  edge: "#7b6f52",
  edgeFaint: "#d9cdb2",
  unalloc: "#b45309",
};

const BENEFICIARY_LABEL: Record<string, string> = {
  linda: "Linda Williams",
  robert: "Robert Williams",
  david: "David Williams",
  jennifer: "Jennifer Williams",
  michael: "Michael Williams",
  "ucla-law": "UCLA School of Law",
  "sm-childrens-health": "SM Children's Health",
  "revocable-trust": "→ Revocable Trust",
};

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function deathOrderForVariant(variant: Variant, edits: CustomEdits): DeathOrder {
  if (variant === "current") return "robert-first";
  return edits.deathOrder ?? "robert-first";
}

export function WaterfallDiagram({ variant, revisions, customEdits, onEditNode }: Props) {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const selected = customEdits.selectedAgreements ?? [];
  const selectedIds = selected.map((s) => s.documentId as Id<"documents">);

  const isRevised = variant === "revised";
  const deathOrder = deathOrderForVariant(variant, customEdits);

  // For the "current" variant we deliberately ignore revision toggles so the
  // user has a clean baseline to compare against.
  const engineRevisions = isRevised
    ? { addResiduaryToSpouse: !!revisions.addResiduaryToSpouse }
    : {};

  const result = useQuery(
    api.waterfalls.compute,
    familyId && selectedIds.length > 0
      ? {
          familyId,
          selectedDocumentIds: selectedIds,
          deathOrder,
          customEdits: { ...customEdits },
          revisions: engineRevisions,
        }
      : "skip",
  );

  if (selectedIds.length === 0) {
    return (
      <EmptyDiagram
        message={
          isRevised
            ? "Pick one or more agreements above to compute the revised waterfall."
            : "No agreements selected. Pick a trust or will to populate the current waterfall."
        }
      />
    );
  }

  if (!result) {
    return <EmptyDiagram message="Computing waterfall…" />;
  }

  const docColumn = selected.map((s) => ({
    id: s.documentId,
    name: s.name,
    category: s.category,
  }));

  // Beneficiary column derived from engine output. Sort by total descending
  // so the largest recipient sits at the top — matches the "where does the
  // money go" reading order.
  const beneficiaryEntries = Object.entries(result.perBeneficiaryTotals).sort(
    (a, b) => b[1] - a[1],
  );

  // Lay out columns. Reserve top slot for the "Estate" source node so flows
  // that originate without a source document (e.g. spouse-residuary edges)
  // have somewhere to anchor. Doc column entries are stacked beneath.
  const sourceY = 50;
  const docColTop = 110;
  const docColStep = Math.min(80, (H - docColTop - 40) / Math.max(docColumn.length, 1));
  const benColTop = 60;
  const benColStep = Math.min(70, (H - benColTop - 40) / Math.max(beneficiaryEntries.length, 1));

  const docPositions = new Map<string, { x: number; y: number }>();
  docColumn.forEach((d, i) => {
    docPositions.set(d.id, { x: 130, y: docColTop + i * docColStep });
  });
  const benPositions = new Map<string, { x: number; y: number }>();
  beneficiaryEntries.forEach(([bId], i) => {
    benPositions.set(bId, { x: W - 110, y: benColTop + i * benColStep });
  });

  const sourcePos = { x: 130, y: sourceY };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Inheritance waterfall diagram"
    >
      <title>Inheritance waterfall diagram</title>

      {/* Source pool (estate). */}
      <Box
        x={sourcePos.x}
        y={sourcePos.y}
        w={180}
        h={32}
        fill={COLORS.trustBlue.fill}
        stroke={COLORS.trustBlue.stroke}
        textColor={COLORS.trustBlue.text}
        label="Estate (selected)"
      />

      {/* Document column. */}
      {docColumn.map((d) => {
        const pos = docPositions.get(d.id);
        if (!pos) return null;
        return (
          <g key={`doc-${d.id}`}>
            <Box
              x={pos.x}
              y={pos.y}
              w={200}
              h={36}
              fill={COLORS.trustBlue.fill}
              stroke={COLORS.trustBlue.stroke}
              textColor={COLORS.trustBlue.text}
              label={truncate(d.name, 28)}
              sublabel={categoryLabel(d.category)}
            />
            {/* Edge from estate down to this doc. */}
            <EdgeLine x1={sourcePos.x} y1={sourcePos.y + 16} x2={pos.x} y2={pos.y - 18} />
          </g>
        );
      })}

      {/* Beneficiary column. */}
      {beneficiaryEntries.map(([bId, total]) => {
        const pos = benPositions.get(bId);
        if (!pos) return null;
        const label = BENEFICIARY_LABEL[bId] ?? bId;
        return (
          <g
            key={`ben-${bId}`}
            style={{ cursor: isRevised && isChildKey(bId) ? "pointer" : "default" }}
            {...(isRevised && isChildKey(bId) && onEditNode
              ? {
                  onClick: () => onEditNode(bId as EditableNodeId),
                  role: "button",
                  tabIndex: 0,
                }
              : {})}
          >
            <Box
              x={pos.x}
              y={pos.y}
              w={180}
              h={48}
              fill={COLORS.beneficiary.fill}
              stroke={COLORS.beneficiary.stroke}
              textColor={COLORS.beneficiary.text}
              label={label}
              sublabel={formatCurrencyShort(total)}
            />
          </g>
        );
      })}

      {/* Engine flows. */}
      {result.flows.map((edge, i) => {
        const from = edge.sourceDocumentId
          ? docPositions.get(String(edge.sourceDocumentId))
          : sourcePos;
        const to = benPositions.get(edge.toBeneficiaryId);
        if (!from || !to) return null;
        const label = formatCurrencyShort(edge.amount);
        return (
          <EdgeLine
            key={`flow-${edge.fromBeneficiaryId ?? "src"}-${edge.toBeneficiaryId}-${i}`}
            x1={from.x + 100}
            y1={from.y}
            x2={to.x - 90}
            y2={to.y}
            label={label}
            color={edge.sourceDocumentId == null ? COLORS.unalloc : COLORS.edge}
            dashed={edge.sourceDocumentId == null}
          />
        );
      })}

      {/* Unallocated banner. */}
      {result.unallocated > 0 && (
        <g>
          <rect
            x={W / 2 - 130}
            y={H - 36}
            width={260}
            height={26}
            rx={6}
            fill="#fff7ed"
            stroke={COLORS.unalloc}
            strokeWidth={1}
          />
          <text
            x={W / 2}
            y={H - 18}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={COLORS.unalloc}
          >
            Unallocated: {formatCurrencyShort(result.unallocated)} (
            {result.unallocatedAssetIds.length} asset
            {result.unallocatedAssetIds.length === 1 ? "" : "s"})
          </text>
        </g>
      )}
    </svg>
  );
}

function isChildKey(id: string): boolean {
  return id === "david" || id === "jennifer" || id === "michael";
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function categoryLabel(c: string): string {
  if (c === "revocable_trust") return "Revocable trust · priority 0";
  if (c === "irrevocable_trust") return "Trust · priority 1";
  if (c === "will") return "Will · priority 2";
  return c;
}

function EmptyDiagram({ message }: { message: string }) {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-md border border-provost-border-subtle border-dashed bg-provost-bg-muted/30 px-6 text-center text-[12px] text-provost-text-secondary">
      {message}
    </div>
  );
}

function Box({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  label,
  sublabel,
  textColor,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  label: string;
  sublabel?: string;
  textColor: string;
}) {
  const rectX = x - w / 2;
  const rectY = y - h / 2;
  return (
    <g>
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx={6}
        ry={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={y + (sublabel ? -3 : 4)}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={textColor}
      >
        {label}
      </text>
      {sublabel && (
        <text x={x} y={y + 11} textAnchor="middle" fontSize={10} fill={textColor}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

function EdgeLine({
  x1,
  y1,
  x2,
  y2,
  label,
  dashed = false,
  color = COLORS.edge,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  dashed?: boolean;
  color?: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1}
        strokeDasharray={dashed ? "4,3" : undefined}
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 3}
          textAnchor="middle"
          fontSize={10}
          fill="#6b5a37"
        >
          {label}
        </text>
      )}
    </g>
  );
}
