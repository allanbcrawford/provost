"use client";

import { cn } from "../../utils/cn";

export type LayerOption<K extends string = string> = {
  key: K;
  label: string;
};

type LayerToggleProps<K extends string = string> = {
  layers: LayerOption<K>[];
  value: Record<K, boolean>;
  onChange: (next: Record<K, boolean>) => void;
  className?: string;
};

export function LayerToggle<K extends string = string>({
  layers,
  value,
  onChange,
  className,
}: LayerToggleProps<K>) {
  const toggle = (key: K) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {layers.map((layer) => {
        const active = value[layer.key];
        return (
          <button
            key={layer.key}
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => toggle(layer.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-provost-border-default bg-provost-bg-inverse text-provost-text-inverse"
                : "border-provost-border-subtle bg-white text-provost-text-secondary hover:bg-provost-bg-muted",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active ? "bg-provost-text-inverse" : "bg-provost-text-tertiary",
              )}
            />
            {layer.label}
          </button>
        );
      })}
    </div>
  );
}

export type { LayerToggleProps };
