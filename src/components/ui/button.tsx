import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cx } from "@/lib/cx";

// Figma "Button": Primary / Secondary / Quiet × Large (56, mobile action areas) / Medium (44, desktop bars).
export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "lg" | "md";

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function buttonClass({ variant = "primary", size = "lg", block = false }: StyleProps = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap select-none",
    "transition-opacity duration-150 ease-out",
    "disabled:opacity-40 aria-disabled:opacity-40 disabled:cursor-not-allowed aria-disabled:pointer-events-none",
    size === "lg" ? "h-14 px-6 vx-body-lg-strong" : "h-11 px-4 vx-body-md-strong",
    variant === "primary" && "bg-primary text-on-primary hover:opacity-90",
    variant === "secondary" && "border border-border-strong text-fg hover:bg-subtle",
    variant === "quiet" && "text-fg hover:bg-subtle",
    block && "w-full",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { busy?: boolean };

export function Button({ variant, size, block, busy, className, disabled, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}
