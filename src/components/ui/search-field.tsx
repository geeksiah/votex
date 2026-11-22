"use client";

import { useRef, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icon";

// Figma "Search field": subtle fill when empty; page colour with focus ring and a clear button when filled.
type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
};

export function SearchField({ value, onValueChange, label, className, placeholder, ...rest }: SearchFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const filled = value.length > 0;
  return (
    <div
      className={cx(
        "flex h-[52px] items-center gap-2.5 rounded-md px-4 transition-colors duration-150",
        filled
          ? "bg-bg shadow-[inset_0_0_0_2px_var(--vx-color-focus)]"
          : "bg-subtle focus-within:bg-bg focus-within:shadow-[inset_0_0_0_2px_var(--vx-color-focus)]",
        className,
      )}
    >
      <Icon name="search" size={20} className="shrink-0 text-muted" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent vx-body-lg text-fg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {filled ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange("");
            ref.current?.focus();
          }}
          className="-mr-2 grid size-10 shrink-0 place-items-center rounded-sm text-muted hover:text-fg"
        >
          <Icon name="clear" size={20} />
        </button>
      ) : null}
    </div>
  );
}
