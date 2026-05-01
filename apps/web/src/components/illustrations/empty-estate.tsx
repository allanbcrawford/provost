// Empty-state illustration for the Estate page.
// Design language reference: docs/Design MOC.md — line-art, restrained, UHNW.

type Props = {
  className?: string;
};

export default function EmptyEstate({ className }: Props) {
  const stroke = "var(--provost-border-strong, #d8d4cf)";
  const subtle = "var(--provost-border-subtle, #eeecea)";
  const fill = "var(--provost-bg-primary, #ffffff)";
  const accent = "var(--provost-text-tertiary, rgba(0,0,0,0.4))";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 220"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document 3 (back, rotated) */}
      <g transform="translate(190 30) rotate(8)" opacity="0.4">
        <rect
          x="0"
          y="0"
          width="110"
          height="150"
          rx="6"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <line x1="14" y1="28" x2="80" y2="28" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="44" x2="92" y2="44" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="60" x2="70" y2="60" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Document 2 (middle) */}
      <g transform="translate(40 22) rotate(-6)" opacity="0.7">
        <rect
          x="0"
          y="0"
          width="120"
          height="160"
          rx="6"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <line x1="16" y1="30" x2="92" y2="30" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="48" x2="100" y2="48" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="66" x2="78" y2="66" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="84" x2="96" y2="84" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Document 1 (front, primary) */}
      <g transform="translate(100 38)">
        <rect
          x="0"
          y="0"
          width="130"
          height="170"
          rx="7"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.75"
        />
        {/* Title line */}
        <line x1="18" y1="28" x2="92" y2="28" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        {/* Body lines */}
        <line x1="18" y1="50" x2="112" y2="50" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="66" x2="106" y2="66" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="82" x2="112" y2="82" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="98" x2="88" y2="98" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="114" x2="102" y2="114" stroke={subtle} strokeWidth="1.5" strokeLinecap="round" />

        {/* Seal / signature mark */}
        <g transform="translate(94 138)">
          <circle cx="0" cy="0" r="14" fill="none" stroke={accent} strokeWidth="1.5" />
          <circle cx="0" cy="0" r="9" fill="none" stroke={accent} strokeWidth="1" />
          <path
            d="M -3 -2 L -1 2 L 4 -3"
            fill="none"
            stroke={accent}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
