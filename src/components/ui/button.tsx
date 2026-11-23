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
    // Tablet and desktop: primary buttons are never narrower than Large 200 / Medium 160 (approved 23 Nov 2026).
    variant === "primary" && (size === "lg" ? "md:min-w-[200px]" : "md:min-w-[160px]"),
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
      className={cx(buttonClass({ variant, size, block }), "relative", busy && "disabled:cursor-wait disabled:opacity-100", className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {/* While busy the label stays in place (so the width does not jump) and a spinner shows over it. */}
      <span className={cx("inline-flex items-center gap-2", busy && "invisible")}>{children}</span>
      {busy ? (
        <span className="absolute inset-0 grid place-items-center" role="status">
          <Spinner />
          <span className="sr-only">Working</span>
        </span>
      ) : null}
    </button>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin motion-reduce:animate-none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}
