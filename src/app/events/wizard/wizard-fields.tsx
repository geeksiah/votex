"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { pickerDate, zonedToIso } from "@/lib/zoned-time";

// Fields shared by the wizard steps and the round editor (Figma Picker, Rule toggle, summary Row).

export function DateField({
  label,
  value,
  onChange,
  tz,
  error,
  short,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tz: string;
  error?: string;
  /** Leave the year out ("Sat 12 Dec · 9:00") and use the compact height in the desktop side panel. */
  short?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div
        className={cx(
          "relative flex h-14 items-center gap-2 rounded-md border bg-bg px-4",
          short && "lg:h-[43px]",
          error
            ? "border-danger-fg shadow-[inset_0_0_0_1px_var(--vx-color-danger-fg)]"
            : "border-border-strong focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="vx-caption text-muted">{label}</span>
          <span className={cx("truncate vx-body-md-strong", value ? "text-fg" : "text-faint")}>
            {value ? (
              short ? (
                pickerDate(zonedToIso(value, tz), tz, false)
              ) : (
                <>
                  <span className="md:hidden lg:inline">{pickerDate(zonedToIso(value, tz), tz)}</span>
                  <span className="hidden md:inline lg:hidden">{pickerDate(zonedToIso(value, tz), tz, false)}</span>
                </>
              )
            ) : (
              "Choose a date and time"
            )}
          </span>
        </span>
        <Chevron />
        <input
          type="datetime-local"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {error ? <p className="vx-caption-medium text-danger-fg">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const chosen = options.find((o) => o.value === value)?.label ?? "";
  return (
    <div className="relative flex h-14 items-center gap-2 rounded-md border border-border-strong bg-bg px-4 focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="vx-caption text-muted">{label}</span>
        <span className="truncate vx-body-md-strong text-fg">{chosen}</span>
      </span>
      <Chevron />
      <select
        aria-label={label}
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

function Chevron() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-muted">
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Figma "Rule": label and note with a switch. `fixed` rules show the switch greyed out and cannot change. */
export function Toggle({
  label,
  note,
  checked,
  onChange,
  fixed,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  fixed?: boolean;
}) {
  return (
    <label className={cx("flex items-center gap-4 border-b border-border py-3.5", fixed ? "cursor-default" : "cursor-pointer")}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="vx-body-md-strong text-fg">{label}</span>
        <span className="vx-caption text-muted">{note}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={fixed}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          "flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
          checked ? "justify-end bg-primary" : "justify-start bg-border-strong",
          fixed && "opacity-40",
        )}
      >
        <span className="size-5 rounded-full bg-white" />
      </span>
    </label>
  );
}

export function Row({ label, value, strong, divided }: { label: string; value: ReactNode; strong?: boolean; divided?: boolean }) {
  return (
    <div className={cx("flex items-center gap-4", divided ? "border-b border-border py-3 last:border-b-0" : "py-2")}>
      <span className={cx("flex-1", strong ? "vx-body-md-strong text-fg" : "vx-body-md text-muted")}>{label}</span>
      <span className={cx("text-right", strong ? "vx-body-md-strong text-fg" : "vx-body-md-medium text-fg")}>{value}</span>
    </div>
  );
}

/**
 * Figma "Payment option": radio card with a title and a short line. In the desktop side panel it is
 * compact (50 high, 15 px title, the short line).
 */
export function OptionCard({
  title,
  line,
  shortLine,
  selected,
  onSelect,
}: {
  title: string;
  line: string;
  /** Line used in the compact desktop card. */
  shortLine?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex h-[76px] shrink-0 items-center gap-3.5 rounded-md bg-bg px-4 text-left md:flex-1",
        shortLine && "lg:h-[50px]",
        selected ? "border-2 border-fg" : "border border-border-strong hover:bg-subtle",
      )}
    >
      <span aria-hidden className={cx("grid size-[22px] shrink-0 place-items-center rounded-full", selected ? "bg-primary" : "border-[1.5px] border-border-strong")}>
        {selected ? <span className="size-2 rounded-full bg-on-primary" /> : null}
      </span>
      <span className="flex flex-col gap-0.5 lg:gap-0">
        <span className={cx("vx-body-lg-medium text-fg", shortLine && "lg:vx-body-md-medium")}>{title}</span>
        <span className={cx("vx-caption text-muted", shortLine && "lg:hidden")}>{line}</span>
        {shortLine ? <span className="hidden vx-caption text-muted lg:block">{shortLine}</span> : null}
      </span>
    </button>
  );
}