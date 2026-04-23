"use client";

import {
  FACET_KEYS,
  FACET_LABELS,
  type FacetKey,
  type FacetSelection,
  type LibrarySourceSummary,
} from "./types";

type Props = {
  sources: LibrarySourceSummary[];
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
};

function collectLabels(sources: LibrarySourceSummary[], key: FacetKey): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of sources) {
    const tags = s.tags[key] ?? [];
    for (const tag of tags) {
      counts.set(tag.label, (counts.get(tag.label) ?? 0) + 1);
    }
  }
  return counts;
}

export function FacetFilter({ sources, selection, onChange }: Props) {
  const toggle = (key: FacetKey, label: string) => {
    const current = selection[key] ?? [];
    const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
    onChange({ ...selection, [key]: next });
  };

  const clearAll = () => onChange({});
  const hasAny = Object.values(selection).some((arr) => arr && arr.length > 0);

  return (
    <aside className="w-[240px] flex-shrink-0 border-provost-border-default border-r pr-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-[13px] text-provost-text-secondary uppercase tracking-[0.5px]">
          Filters
        </h2>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-provost-text-secondary hover:text-provost-text-primary"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-5">
        {FACET_KEYS.map((key) => {
          const counts = collectLabels(sources, key);
          if (counts.size === 0) return null;
          const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
          const selected = selection[key] ?? [];
          return (
            <section key={key}>
              <h3 className="mb-2 font-semibold text-[11px] text-provost-text-secondary uppercase tracking-[0.5px]">
                {FACET_LABELS[key]}
              </h3>
              <ul className="space-y-1">
                {entries.map(([label, count]) => {
                  const isOn = selected.includes(label);
                  return (
                    <li key={label}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[13px] hover:bg-provost-bg-secondary">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggle(key, label)}
                          className="accent-provost-text-primary"
                        />
                        <span className="flex-1 truncate">{label}</span>
                        <span className="text-[11px] text-provost-text-secondary">{count}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
