"use client";

// Material Design–style determinate progress ring wrapped around a Material
// Symbols glyph. One icon per lesson format (read / listen / watch / quiz).
//
// Beta scope: Listen + Watch render disabled with a "Coming soon" tooltip
// (NotebookLM integration deferred to V2 per beta-scope-request.md). Read +
// Quiz are live. Component is intentionally general-purpose so the family
// progress views (PRO-135 / Issue 3.3) can drop it into table rows.
//
// Theming uses CSS custom properties from packages/ui/src/styles.css so the
// component carries through to dark mode without hardcoded colors. The repo
// has no Tooltip primitive in @provost/ui, so the "Coming soon" hint uses a
// native `title` attribute (accessible + zero-dep).

import { cn } from "@provost/ui";

export type FormatKind = "read" | "listen" | "watch" | "quiz";

type Props = {
  kind: FormatKind;
  progress: number; // 0..1; clamped internally
  disabled?: boolean; // overrides progress; shows muted state
  size?: number; // px, default 40
  className?: string;
  label?: string; // optional aria-label override
};

const ICON_BY_KIND: Record<FormatKind, string> = {
  read: "menu_book",
  listen: "headphones",
  watch: "play_circle",
  quiz: "quiz",
};

const KIND_LABEL: Record<FormatKind, string> = {
  read: "Read",
  listen: "Listen",
  watch: "Watch",
  quiz: "Quiz",
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function FormatProgressIcon({
  kind,
  progress,
  disabled = false,
  size = 40,
  className,
  label,
}: Props) {
  const value = clamp01(progress);
  const pct = Math.round(value * 100);
  const complete = !disabled && value >= 1;

  // Ring geometry. Stroke width scales lightly with size so the ring stays
  // visible at small (24px) and large (56px) renders without looking heavy.
  const stroke = Math.max(1.5, Math.round(size / 22));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = disabled
    ? circumference // empty when disabled
    : circumference * (1 - value);

  // Aria label: explicit override wins, then disabled phrasing, else
  // "Kind, NN% complete" / "Kind, not started".
  const computedLabel =
    label ??
    (disabled
      ? `${KIND_LABEL[kind]} — coming soon`
      : value === 0
        ? `${KIND_LABEL[kind]}, not started`
        : `${KIND_LABEL[kind]}, ${pct}% complete`);

  // Color tokens. Foreground ring uses the strong text color (theme-aware),
  // success-green when complete, and neutral-300 when disabled. Background
  // ring is always neutral-200 at low opacity.
  const ringFg = disabled
    ? "var(--provost-neutral-300)"
    : complete
      ? "#10b981" // emerald-500 — repo uses bg-emerald-* for completion states
      : "var(--provost-text-primary)";
  const ringBg = "var(--provost-neutral-200)";
  const iconColor = disabled
    ? "var(--provost-neutral-400)"
    : "var(--provost-text-primary)";

  return (
    <span
      role="img"
      aria-label={computedLabel}
      title={disabled ? "Coming soon" : computedLabel}
      data-kind={kind}
      data-disabled={disabled || undefined}
      data-complete={complete || undefined}
      className={cn(
        "relative inline-flex items-center justify-center",
        disabled && "opacity-70",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Progress ring. Rotated -90deg so 0% sits at 12 o'clock and the
          stroke sweeps clockwise. */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 absolute inset-0"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringBg}
          strokeWidth={stroke}
          opacity={0.6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringFg}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 240ms ease-out" }}
        />
      </svg>

      {/* Inner Material Symbol. Sized at ~55% of the outer footprint so the
          ring stays visually distinct from the glyph. */}
      <span
        className="material-symbols-outlined select-none"
        style={{
          fontSize: Math.round(size * 0.55),
          fontVariationSettings: `'wght' 400, 'FILL' ${complete ? 1 : 0}`,
          color: iconColor,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {ICON_BY_KIND[kind]}
      </span>

      {/* Completion check overlay in the corner — only when fully complete
          and not disabled. Uses the same emerald used in lesson status pills. */}
      {complete && (
        <span
          className="material-symbols-outlined absolute"
          style={{
            right: -2,
            bottom: -2,
            fontSize: Math.max(12, Math.round(size * 0.32)),
            fontVariationSettings: `'wght' 700, 'FILL' 1`,
            color: "#10b981",
            background: "var(--provost-bg, #fff)",
            borderRadius: "9999px",
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          check_circle
        </span>
      )}
    </span>
  );
}
