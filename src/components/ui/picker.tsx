"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";

// Figma "Picker": 56 high, small label above the chosen value, chevron on the right.
// A real <select> sits on top (transparent) so keyboards, screen readers and phone pickers work.
type PickerProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  name?: string;
  className?: string;
};

export function Picker({ label, value, options, onChange, name, className }: PickerProps) {
  const id = useId();
  const chosen = options.find((o) => o.value === value)?.label ?? "";
  return (
    <div
      className={cx(
        "relative flex h-14 items-center gap-2 rounded-md border border-border-strong bg-bg px-4",
        "focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="vx-caption text-muted">
          {label}
        </label>
        <span aria-hidden className="truncate vx-body-md-strong text-fg">
          {chosen}
        </span>
      </div>
      <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-muted">
        <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
