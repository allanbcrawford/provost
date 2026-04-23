"use client";

import {
  type ChildrenPct,
  type CustomEdits,
  DEFAULT_CHILDREN_PCT,
  DEFAULT_TRUST_B_FUNDING,
  type DeathOrder,
  type EditableNodeId,
  type RevisionState,
} from "./types";

type Variant = "current" | "revised";

type Props = {
  variant: Variant;
  revisions: RevisionState;
  customEdits: CustomEdits;
  onEditNode?: (nodeId: EditableNodeId) => void;
};

const W = 560;
const H = 640;
const TRUST_TOP = { x: W / 2, y: 40, w: 220, h: 34 };
const FIRST_DEATH = { x: W / 2, y: 150, w: 170, h: 46 };
const TRUST_A = { x: 90, y: 280, w: 160, h: 36 };
const TRUST_B = { x: W / 2, y: 280, w: 160, h: 36 };
const TRUST_C = { x: W - 90, y: 280, w: 160, h: 36 };
const SECOND_DEATH = { x: W / 2, y: 410, w: 200, h: 46 };
const CHILD_BOX = { y: 540, w: 140, h: 60 };
const CHILD_X = [110, W / 2, W - 110];

const COLORS = {
  trustBlue: { fill: "#dbe7f3", stroke: "#2c67a0", text: "#1b3d62" },
  trustMint: { fill: "#d9ead3", stroke: "#5f8a4a", text: "#304c21" },
  trustTeal: { fill: "#cfe4e0", stroke: "#4a8a83", text: "#23504a" },
  event: { fill: "#f5d79e", stroke: "#c5922f", text: "#59380d" },
  child: { fill: "#efe6d4", stroke: "#b3a37a", text: "#3a2f17" },
  ilit: { fill: "#fbe6b8", stroke: "#c18b2c", text: "#5b3b0a" },
  edge: "#7b6f52",
  edgeFaint: "#d9cdb2",
  ilitDash: "#c18b2c",
  portable: "#2c67a0",
  qtip: "#b45309",
  custom: "#6d28d9",
};

function getChildrenPct(customEdits: CustomEdits): ChildrenPct {
  return customEdits.childrenPct ?? DEFAULT_CHILDREN_PCT;
}

function getTrustBFunding(revisions: RevisionState, customEdits: CustomEdits): number {
  if (customEdits.trustBFunding !== undefined) return customEdits.trustBFunding;
  if (revisions.portability) return 0.5;
  return DEFAULT_TRUST_B_FUNDING;
}

function deathOrderLabels(order: DeathOrder | undefined): { first: string; second: string } {
  switch (order) {
    case "robert-first":
      return { first: "Robert Passes Away", second: "Linda Passes Away" };
    case "linda-first":
      return { first: "Linda Passes Away", second: "Robert Passes Away" };
    case "simultaneous":
      return { first: "Simultaneous Death", second: "Estate passes to children" };
    default:
      return { first: "First Spouse Passes Away", second: "Surviving Spouse Passes Away" };
  }
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
  desaturated,
  editable,
  onEdit,
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
  desaturated?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const rectX = x - w / 2;
  const rectY = y - h / 2;
  const interactive = editable && onEdit;
  return (
    <g
      style={{ opacity: desaturated ? 0.45 : 1, cursor: interactive ? "pointer" : "default" }}
      {...(interactive
        ? {
            onClick: onEdit,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") onEdit();
            },
            role: "button",
            tabIndex: 0,
          }
        : {})}
    >
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
        <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={500} fill={textColor}>
          {sublabel}
        </text>
      )}
      {editable && (
        <g transform={`translate(${rectX + w - 12}, ${rectY + 2})`}>
          <circle r={6} fill={COLORS.custom} />
          <text x={0} y={3} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={700}>
            ✎
          </text>
        </g>
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
  faint = false,
  thick = false,
  color = COLORS.edge,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  dashed?: boolean;
  faint?: boolean;
  thick?: boolean;
  color?: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={faint ? COLORS.edgeFaint : color}
        strokeWidth={thick ? 2 : 1}
        strokeDasharray={dashed ? "4,3" : undefined}
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 3}
          textAnchor="middle"
          fontSize={10}
          fill={faint ? "#b3a68e" : "#6b5a37"}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function WaterfallDiagram({ variant, revisions, customEdits, onEditNode }: Props) {
  const isRevised = variant === "revised";
  const labels = deathOrderLabels(isRevised ? customEdits.deathOrder : undefined);
  const pct = getChildrenPct(customEdits);
  const trustBFunding = getTrustBFunding(revisions, customEdits);

  const showFunded = isRevised && revisions.fundRevocable;
  const showIlit = isRevised && revisions.ilit;
  const showBuysell = isRevised && revisions.buysell;
  const showPortability = isRevised && revisions.portability;
  const showQtip = isRevised && revisions.qtip;
  const hasCustomChildren = isRevised && !!customEdits.childrenPct;
  const hasCustomTrustB = isRevised && customEdits.trustBFunding !== undefined;
  const hasCustomDeath = isRevised && !!customEdits.deathOrder;

  const trustBEdgeLabel = showPortability
    ? "Minimal (portability)"
    : `$${trustBFunding.toFixed(1)}M`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Inheritance waterfall diagram"
    >
      <title>Inheritance waterfall diagram</title>
      <Box
        x={TRUST_TOP.x}
        y={TRUST_TOP.y}
        w={TRUST_TOP.w}
        h={TRUST_TOP.h}
        fill={COLORS.trustBlue.fill}
        stroke={COLORS.trustBlue.stroke}
        textColor={COLORS.trustBlue.text}
        label="Williams Family Living Trust"
      />
      {showFunded && (
        <g>
          <rect
            x={TRUST_TOP.x - 55}
            y={TRUST_TOP.y + TRUST_TOP.h / 2 + 4}
            width={110}
            height={18}
            rx={4}
            fill="#e3f4df"
            stroke="#5f8a4a"
            strokeWidth={1}
          />
          <text
            x={TRUST_TOP.x}
            y={TRUST_TOP.y + TRUST_TOP.h / 2 + 16}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#304c21"
          >
            ✓ Fully funded
          </text>
        </g>
      )}

      {showIlit && (
        <g>
          <rect
            x={W - 120}
            y={18}
            width={100}
            height={40}
            rx={6}
            fill={COLORS.ilit.fill}
            stroke={COLORS.ilit.stroke}
            strokeWidth={1.2}
          />
          <text
            x={W - 70}
            y={35}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={COLORS.ilit.text}
          >
            ILIT
          </text>
          <text x={W - 70} y={48} textAnchor="middle" fontSize={9} fill={COLORS.ilit.text}>
            $15M policy
          </text>
          <path
            d={`M ${W - 70} 58 C ${W - 30} 200, ${W - 30} 420, ${W - 30} ${CHILD_BOX.y}`}
            stroke={COLORS.ilitDash}
            strokeWidth={1.3}
            strokeDasharray="5,4"
            fill="none"
          />
          <text
            x={W - 22}
            y={CHILD_BOX.y - 4}
            textAnchor="end"
            fontSize={9}
            fill={COLORS.ilit.text}
          >
            outside estate
          </text>
        </g>
      )}

      <EdgeLine
        x1={TRUST_TOP.x}
        y1={TRUST_TOP.y + TRUST_TOP.h / 2 + (showFunded ? 22 : 0)}
        x2={FIRST_DEATH.x}
        y2={FIRST_DEATH.y - FIRST_DEATH.h / 2}
        label="Upon first death"
      />

      <Box
        x={FIRST_DEATH.x}
        y={FIRST_DEATH.y}
        w={FIRST_DEATH.w}
        h={FIRST_DEATH.h}
        fill={COLORS.event.fill}
        stroke={COLORS.event.stroke}
        textColor={COLORS.event.text}
        label={labels.first.split(" ")[0] ?? labels.first}
        sublabel={labels.first.split(" ").slice(1).join(" ") || " "}
        editable={isRevised}
        onEdit={() => onEditNode?.("firstDeath")}
      />
      {hasCustomDeath && (
        <text
          x={FIRST_DEATH.x}
          y={FIRST_DEATH.y + FIRST_DEATH.h / 2 + 14}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill={COLORS.custom}
        >
          CUSTOM
        </text>
      )}

      <EdgeLine
        x1={FIRST_DEATH.x - 30}
        y1={FIRST_DEATH.y + FIRST_DEATH.h / 2}
        x2={TRUST_A.x}
        y2={TRUST_A.y - TRUST_A.h / 2}
        label="Spouse's half"
      />
      <EdgeLine
        x1={FIRST_DEATH.x}
        y1={FIRST_DEATH.y + FIRST_DEATH.h / 2}
        x2={TRUST_B.x}
        y2={TRUST_B.y - TRUST_B.h / 2}
        label={isRevised ? trustBEdgeLabel : "Up to exemption"}
        faint={showPortability}
      />
      <EdgeLine
        x1={FIRST_DEATH.x + 30}
        y1={FIRST_DEATH.y + FIRST_DEATH.h / 2}
        x2={TRUST_C.x}
        y2={TRUST_C.y - TRUST_C.h / 2}
        label="Excess (if any)"
      />

      {showBuysell && (
        <g>
          <rect
            x={TRUST_B.x - 65}
            y={TRUST_B.y - TRUST_B.h / 2 - 44}
            width={130}
            height={22}
            rx={4}
            fill="#ede4ff"
            stroke={COLORS.custom}
            strokeWidth={1}
            strokeDasharray="3,2"
          />
          <text
            x={TRUST_B.x}
            y={TRUST_B.y - TRUST_B.h / 2 - 30}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill={COLORS.custom}
          >
            +$12M buy-sell cash
          </text>
          <line
            x1={TRUST_B.x}
            y1={TRUST_B.y - TRUST_B.h / 2 - 22}
            x2={TRUST_B.x}
            y2={TRUST_B.y - TRUST_B.h / 2}
            stroke={COLORS.custom}
            strokeDasharray="3,2"
            strokeWidth={1}
          />
        </g>
      )}

      <Box
        x={TRUST_A.x}
        y={TRUST_A.y}
        w={TRUST_A.w}
        h={TRUST_A.h}
        fill={COLORS.trustBlue.fill}
        stroke={COLORS.trustBlue.stroke}
        textColor={COLORS.trustBlue.text}
        label="Survivor's Trust (A)"
      />
      <Box
        x={TRUST_B.x}
        y={TRUST_B.y}
        w={TRUST_B.w}
        h={TRUST_B.h}
        fill={COLORS.trustMint.fill}
        stroke={COLORS.trustMint.stroke}
        textColor={COLORS.trustMint.text}
        label="Family Trust (B)"
        desaturated={showPortability}
        editable={isRevised}
        onEdit={() => onEditNode?.("trustB")}
      />
      <Box
        x={TRUST_C.x}
        y={TRUST_C.y}
        w={TRUST_C.w}
        h={TRUST_C.h}
        fill={COLORS.trustTeal.fill}
        stroke={COLORS.trustTeal.stroke}
        textColor={COLORS.trustTeal.text}
        label="Marital Trust (C)"
      />

      {showPortability && (
        <g>
          <rect
            x={TRUST_B.x - 40}
            y={TRUST_B.y + TRUST_B.h / 2 + 4}
            width={80}
            height={16}
            rx={8}
            fill="#dbe7f3"
            stroke={COLORS.portable}
          />
          <text
            x={TRUST_B.x}
            y={TRUST_B.y + TRUST_B.h / 2 + 15}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill={COLORS.portable}
          >
            portable · minimal
          </text>
        </g>
      )}
      {hasCustomTrustB && !showPortability && (
        <text
          x={TRUST_B.x}
          y={TRUST_B.y + TRUST_B.h / 2 + 14}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={COLORS.custom}
        >
          custom ${trustBFunding.toFixed(1)}M
        </text>
      )}

      {showQtip && (
        <g>
          <rect
            x={TRUST_C.x - 36}
            y={TRUST_C.y + TRUST_C.h / 2 + 4}
            width={72}
            height={16}
            rx={8}
            fill="#fffbeb"
            stroke={COLORS.qtip}
          />
          <text
            x={TRUST_C.x}
            y={TRUST_C.y + TRUST_C.h / 2 + 15}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill={COLORS.qtip}
          >
            QTIP · locked
          </text>
        </g>
      )}

      <EdgeLine
        x1={TRUST_A.x}
        y1={TRUST_A.y + TRUST_A.h / 2 + 24}
        x2={SECOND_DEATH.x - 20}
        y2={SECOND_DEATH.y - SECOND_DEATH.h / 2}
        label="Trust A"
      />
      <EdgeLine
        x1={TRUST_B.x}
        y1={TRUST_B.y + TRUST_B.h / 2 + 24}
        x2={SECOND_DEATH.x}
        y2={SECOND_DEATH.y - SECOND_DEATH.h / 2}
        label="Trust B"
        faint={showPortability}
        dashed={showPortability}
      />
      <EdgeLine
        x1={TRUST_C.x}
        y1={TRUST_C.y + TRUST_C.h / 2 + 24}
        x2={SECOND_DEATH.x + 20}
        y2={SECOND_DEATH.y - SECOND_DEATH.h / 2}
        label="Trust C"
      />

      <Box
        x={SECOND_DEATH.x}
        y={SECOND_DEATH.y}
        w={SECOND_DEATH.w}
        h={SECOND_DEATH.h}
        fill={COLORS.event.fill}
        stroke={COLORS.event.stroke}
        textColor={COLORS.event.text}
        label={labels.second.split(" ").slice(0, 2).join(" ")}
        sublabel={labels.second.split(" ").slice(2).join(" ") || " "}
      />

      {(["david", "jennifer", "michael"] as const).map((key, i) => {
        const val = pct[key];
        const cx = CHILD_X[i] ?? 0;
        return (
          <EdgeLine
            key={`edge-${key}`}
            x1={SECOND_DEATH.x + (i === 0 ? -25 : i === 2 ? 25 : 0)}
            y1={SECOND_DEATH.y + SECOND_DEATH.h / 2}
            x2={cx}
            y2={CHILD_BOX.y - CHILD_BOX.h / 2}
            label={`${val}%`}
            thick={showQtip}
            color={showQtip ? "#5a7a4d" : COLORS.edge}
          />
        );
      })}

      {(["david", "jennifer", "michael"] as const).map((key, i) => {
        const val = pct[key];
        const cx = CHILD_X[i] ?? 0;
        const name =
          key === "david"
            ? "David Williams"
            : key === "jennifer"
              ? "Jennifer Williams"
              : "Michael Williams";
        const role = key === "jennifer" ? "Daughter" : "Son";
        const rectX = cx - CHILD_BOX.w / 2;
        const rectY = CHILD_BOX.y - CHILD_BOX.h / 2;
        return (
          <g
            key={`child-${key}`}
            style={{ cursor: isRevised ? "pointer" : "default" }}
            {...(isRevised && onEditNode
              ? {
                  onClick: () => onEditNode(key),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") onEditNode(key);
                  },
                  role: "button",
                  tabIndex: 0,
                }
              : {})}
          >
            <rect
              x={rectX}
              y={rectY}
              width={CHILD_BOX.w}
              height={CHILD_BOX.h}
              rx={6}
              fill={COLORS.child.fill}
              stroke={COLORS.child.stroke}
              strokeWidth={1.2}
            />
            <text
              x={cx}
              y={rectY + 18}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={COLORS.child.text}
            >
              {name}
            </text>
            <text
              x={cx}
              y={rectY + 34}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill={COLORS.child.text}
            >
              {val}%
            </text>
            <text x={cx} y={rectY + 50} textAnchor="middle" fontSize={10} fill="#6a5a37">
              {role}
            </text>
            {isRevised && (
              <g transform={`translate(${rectX + CHILD_BOX.w - 12}, ${rectY + 2})`}>
                <circle r={6} fill={COLORS.custom} />
                <text x={0} y={3} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={700}>
                  ✎
                </text>
              </g>
            )}
            {hasCustomChildren && (
              <text
                x={cx}
                y={rectY + CHILD_BOX.h + 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill={COLORS.custom}
              >
                CUSTOM
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
