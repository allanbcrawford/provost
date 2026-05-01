// Empty-state illustration for the Family list view.
// Design language reference: docs/Design MOC.md — line-art, restrained, UHNW.

type Props = {
  className?: string;
};

export default function EmptyFamilyList({ className }: Props) {
  const stroke = "var(--provost-border-strong, #d8d4cf)";
  const subtle = "var(--provost-border-subtle, #eeecea)";
  const fill = "var(--provost-bg-primary, #ffffff)";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card 3 (back) */}
      <g transform="translate(36 28)" opacity="0.45">
        <rect
          x="0"
          y="0"
          width="248"
          height="44"
          rx="8"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <circle cx="26" cy="22" r="10" fill="none" stroke={stroke} strokeWidth="1.5" />
        <line x1="50" y1="18" x2="150" y2="18" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="28" x2="120" y2="28" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Card 2 (middle) */}
      <g transform="translate(28 78)" opacity="0.75">
        <rect
          x="0"
          y="0"
          width="264"
          height="48"
          rx="8"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <circle cx="28" cy="24" r="11" fill="none" stroke={stroke} strokeWidth="1.5" />
        <line x1="54" y1="19" x2="170" y2="19" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
        <line x1="54" y1="30" x2="132" y2="30" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Card 1 (front, fully visible) */}
      <g transform="translate(20 132)">
        <rect
          x="0"
          y="0"
          width="280"
          height="52"
          rx="9"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.75"
        />
        <circle cx="30" cy="26" r="12" fill="none" stroke={stroke} strokeWidth="1.75" />
        <text
          x="30"
          y="30"
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-geist), system-ui, sans-serif"
          fill="var(--provost-text-tertiary, rgba(0,0,0,0.4))"
        >
          +
        </text>
        <line x1="58" y1="20" x2="200" y2="20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <line x1="58" y1="32" x2="150" y2="32" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
