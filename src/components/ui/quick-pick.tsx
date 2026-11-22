"use client";

import { cx } from "@/lib/cx";

// Figma "Quick pick": vote amount chips 1 · 5 · 10 · 50 (+ Custom). 52 tall, selected = primary fill.
type QuickPickProps = {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function QuickPick({ options, value, onChange, label, className }: QuickPickProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              "h-[52px] min-w-16 flex-1 rounded-md px-3 vx-body-md-medium tabular transition-colors duration-150",
              selected ? "bg-primary text-on-primary" : "border border-border-strong text-fg hover:bg-subtle",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
