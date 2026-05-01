// Empty-state illustration for the Family Tree (graph) view.
// Design language reference: docs/Design MOC.md — line-art, restrained, UHNW.

type Props = {
  className?: string;
};

export default function EmptyFamilyTree({ className }: Props) {
  const stroke = "var(--provost-border-strong, #d8d4cf)";
  const subtle = "var(--provost-border-subtle, #eeecea)";
  const fill = "var(--provost-bg-primary, #ffffff)";
  const accent = "var(--provost-text-tertiary, rgba(0,0,0,0.4))";

  // Node positions (cx, cy)
  const root = { x: 180, y: 50 };
  const l2a = { x: 90, y: 130 };
  const l2b = { x: 270, y: 130 };
  const l3a = { x: 50, y: 200 };
  const l3b = { x: 130, y: 200 }; // dashed (placeholder)
  const l3c = { x: 230, y: 200 };
  const l3d = { x: 310, y: 200 };

  const r = 18;

  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const midY = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y + r} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y - r}`;
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 240"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      <g fill="none" stroke={subtle} strokeWidth="1.5">
        <path d={curve(root, l2a)} />
        <path d={curve(root, l2b)} />
        <path d={curve(l2a, l3a)} />
        <path d={curve(l2a, l3b)} />
        <path d={curve(l2b, l3c)} />
        <path d={curve(l2b, l3d)} />
      </g>

      {/* Nodes */}
      <g fill={fill} stroke={stroke} strokeWidth="1.75">
        <circle cx={root.x} cy={root.y} r={r} />
        <circle cx={l2a.x} cy={l2a.y} r={r} />
        <circle cx={l2b.x} cy={l2b.y} r={r} />
        <circle cx={l3a.x} cy={l3a.y} r={r} />
        <circle cx={l3c.x} cy={l3c.y} r={r} />
        <circle cx={l3d.x} cy={l3d.y} r={r} />
      </g>

      {/* Highlighted placeholder node (dashed) */}
      <circle
        cx={l3b.x}
        cy={l3b.y}
        r={r}
        fill={fill}
        stroke={accent}
        strokeWidth="1.75"
        strokeDasharray="3 3"
      />
      <text
        x={l3b.x}
        y={l3b.y + 4}
        textAnchor="middle"
        fontSize="16"
        fontFamily="var(--font-geist), system-ui, sans-serif"
        fill={accent}
      >
        +
      </text>
    </svg>
  );
}
