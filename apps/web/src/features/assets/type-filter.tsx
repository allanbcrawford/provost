"use client";

const TYPES = ["Brokerage", "Private Equity", "Real Estate", "Checking", "Entities"] as const;

export function TypeFilter({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full border px-4 py-1.5 text-[13px] font-medium tracking-[-0.39px] transition-colors ${
          selected === null
            ? "border-provost-text-primary bg-provost-text-primary text-white"
            : "border-provost-border-subtle bg-white text-provost-text-secondary hover:bg-provost-bg-muted/40"
        }`}
      >
        All
      </button>
      {TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-medium tracking-[-0.39px] transition-colors ${
            selected === t
              ? "border-provost-text-primary bg-provost-text-primary text-white"
              : "border-provost-border-subtle bg-white text-provost-text-secondary hover:bg-provost-bg-muted/40"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
