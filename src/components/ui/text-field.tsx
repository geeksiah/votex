"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icon";

// Figma "Text field": one field, any length (codes, phone, email, custom amounts). States: default, focused, error.
type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  helper?: ReactNode;
  error?: ReactNode;
  /** Value text size. Figma uses 20 for codes and email; 17 for longer form fields. */
  valueSize?: "lg" | "md";
};

export function TextField({ label, helper, error, valueSize = "lg", id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const note = error ?? helper;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="vx-body-md-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cx(
          "h-14 w-full rounded-md border bg-bg px-4 text-fg outline-none placeholder:text-faint",
          valueSize === "lg" ? "text-[20px] leading-[1.45]" : "vx-body-lg",
          "transition-[border-color,box-shadow] duration-150",
          error
            ? "border-danger-fg shadow-[inset_0_0_0_1px_var(--vx-color-danger-fg)]"
            : "border-border-strong focus:border-focus focus:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]",
        )}
        {...rest}
      />
      {note ? (
        <p
          id={noteId}
          className={cx("flex items-center gap-1.5", error ? "vx-caption-medium text-danger-fg" : "vx-caption text-muted")}
        >
          {error ? <Icon name="alert" size={16} className="shrink-0" /> : null}
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  );
}
