import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

// O1 onboarding frame (Figma "O1 · Mobile · Organisation / Brand", "Desktop 1280 · Onboarding brand",
// "Tablet 768 · Payouts"). Phone: back + progress, fields, action area pinned to the bottom.
// Tablet 768: centred white card on the subtle background. Desktop ≥1024: top bar, form left, preview right.
export const SETUP_STEPS = 4;

type SetupShellProps = {
  step: number;
  title: string;
  subtitle: string;
  /** Phone header: back button (left) and optional quiet action such as "Skip" (right). */
  back: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  /** Primary button plus, on tablet and desktop, any quiet action next to it. */
  actions: ReactNode;
  aside?: ReactNode;
};

export function SetupShell({ step, title, subtitle, back, headerAction, children, actions, aside }: SetupShellProps) {
  const label = `Set up · ${step} of ${SETUP_STEPS}`;
  return (
    <div className="flex min-h-dvh flex-col bg-bg md:bg-subtle md:pt-12 lg:bg-bg lg:pt-0">
      {/* Phone header */}
      <header className="flex h-14 items-center gap-3 px-5 md:hidden">
        {back}
        <span className="flex-1" />
        {headerAction}
      </header>
      {/* Tablet header (above the card) */}
      <header className="mx-auto hidden h-10 w-[560px] items-center md:flex lg:hidden">
        <Wordmark />
        <span className="flex-1" />
        <span className="vx-body-md-medium text-muted">{label}</span>
      </header>
      {/* Desktop top bar */}
      <header className="hidden h-16 items-center border-b border-border px-10 lg:flex">
        <Wordmark />
        <span className="flex-1" />
        <span className="vx-body-md-medium text-muted">{label}</span>
      </header>

      <div className="flex flex-1 flex-col md:mx-auto md:mt-6 md:w-[560px] md:flex-none lg:mx-0 lg:mt-0 lg:w-auto lg:flex-1 lg:flex-row lg:items-start lg:gap-16 lg:px-40 lg:pt-14">
        <div
          className={cx(
            "flex flex-1 flex-col gap-5 px-6 pt-2 pb-[140px]",
            "md:flex-none md:rounded-lg md:border md:border-border md:bg-bg md:p-10",
            "lg:flex-1 lg:gap-6 lg:rounded-none lg:border-0 lg:p-0",
          )}
        >
          <div className="flex flex-col gap-2.5 md:hidden">
            <p className="vx-caption-medium text-muted">{label}</p>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: SETUP_STEPS }, (_, i) => (
                <span key={i} className={cx("h-1 flex-1 rounded-[2px]", i < step ? "bg-fg" : "bg-border")} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="vx-heading-xl text-fg">{title}</h1>
            <p className="vx-body-lg text-muted">{subtitle}</p>
          </div>
          {children}
          {/* Action area: pinned on phones, inline in the card / form on tablet and desktop. */}
          <div className="fixed inset-x-0 bottom-0 flex flex-col border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:static md:border-0 md:p-0 lg:flex-row lg:items-center lg:gap-4">
            {actions}
          </div>
        </div>
        {aside ? <div className="hidden lg:block">{aside}</div> : null}
      </div>
    </div>
  );
}

export function BackButton({ label, ...rest }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle"
      {...rest}
    >
      <Icon name="chevron-left" />
    </button>
  );
}
