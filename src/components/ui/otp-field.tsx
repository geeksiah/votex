"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icon";

// O1 "Email code": six boxes (50×60, radius 12). One real input underneath so paste, autofill
// (autocomplete="one-time-code") and screen readers work as a single field.
type OtpFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
};

export function OtpField({ label, value, onChange, length = 6, error, autoFocus }: OtpFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden className="flex gap-2">
          {Array.from({ length }, (_, i) => {
            const isActive = focused && i === active;
            return (
              <div
                key={i}
                className={cx(
                  "grid h-[60px] min-w-0 flex-1 place-items-center rounded-md border bg-bg vx-heading-lg text-fg tabular",
                  error ? "border-danger-fg" : isActive ? "border-focus shadow-[inset_0_0_0_1px_var(--vx-color-focus)]" : "border-border-strong",
                )}
              >
                {value[i] ?? ""}
              </div>
            );
          })}
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 vx-caption-medium text-danger-fg">
          <Icon name="alert" size={16} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
