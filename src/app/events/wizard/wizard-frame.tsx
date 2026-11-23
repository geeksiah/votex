"use client";

import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

// O3 frame (Figma "O3 · Mobile · 1–7", "Tablet 768 · 2 Basics", "Desktop 1280 · 1 Type / 6 Price / 7 Review").
// Phone: header (close or back, Save draft), 7-part progress, action area pinned to the bottom.
// Tablet 768: same order, 560 wide column, full-width button in the footer.
// Desktop ≥1024: step rail on the left, "Step n of 7" top bar, Back and primary in the footer.
export const STEP_NAMES = ["Type", "Basics", "Look", "Rounds", "Rules", "Price", "Review"] as const;

type WizardFrameProps = {
  step: number;
  /** Steps the organiser has finished (shown with a tick in the desktop rail). */
  done: (step: number) => boolean;
  onStep: (step: number) => void;
  onBack: () => void;
  onClose: () => void;
  onSaveDraft: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
  primary: string;
  busy: boolean;
  savingDraft: boolean;
  below?: ReactNode;
};

export function WizardFrame(p: WizardFrameProps) {
  const total = STEP_NAMES.length;
  const first = p.step === 1;
  const saveDraft = (
    <button
      type="button"
      onClick={p.onSaveDraft}
      disabled={p.savingDraft}
      className="vx-body-md-medium text-fg underline-offset-4 hover:underline disabled:opacity-40"
    >
      Save draft
    </button>
  );
  const backOrClose = first ? (
    <button type="button" aria-label="Close" onClick={p.onClose} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
      <Icon name="close" />
    </button>
  ) : (
    <button type="button" aria-label="Back" onClick={p.onBack} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
      <Icon name="chevron-left" />
    </button>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Desktop step rail */}
      <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col gap-1 bg-subtle pt-8 pr-6 pl-8 lg:flex">
        <Wordmark />
        <p className="mt-11 mb-3 vx-caption-medium text-muted">New event</p>
        {STEP_NAMES.map((name, i) => {
          const n = i + 1;
          const current = n === p.step;
          const isDone = !current && p.done(n);
          const reachable = isDone || current;
          return (
            <button
              key={name}
              type="button"
              disabled={!reachable}
              onClick={() => p.onStep(n)}
              aria-current={current ? "step" : undefined}
              className={cx(
                "flex h-11 items-center gap-3 rounded-[10px] pl-2.5 text-left",
                current ? "bg-bg vx-body-md-strong text-fg" : "vx-body-md text-fg",
                reachable && !current && "hover:bg-bg/60",
              )}
            >
              <span
                aria-hidden
                className={cx(
                  "grid size-6 shrink-0 place-items-center rounded-full vx-caption-strong",
                  isDone ? "bg-primary text-on-primary" : current ? "border-[1.5px] border-fg text-fg" : "border-[1.5px] border-border-strong text-fg",
                )}
              >
                {isDone ? <Icon name="check" size={14} /> : n}
              </span>
              {name}
              {isDone ? <span className="sr-only">, done</span> : null}
            </button>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone header */}
        <header className="flex h-14 items-center gap-3 px-5 md:hidden">
          {backOrClose}
          <span className="flex-1" />
          {saveDraft}
        </header>
        {/* Tablet header */}
        <header className="hidden h-16 items-center gap-6 px-10 md:flex lg:hidden">
          {backOrClose}
          <span className="flex-1" />
          {saveDraft}
        </header>
        {/* Desktop top bar */}
        <header className="hidden h-16 items-center gap-6 pr-8 pl-12 lg:flex">
          <span className="vx-body-md-medium text-muted">
            Step {p.step} of {total}
          </span>
          <span className="flex-1" />
          {saveDraft}
          <button type="button" aria-label="Close" onClick={p.onClose} className="grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="close" />
          </button>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row lg:items-start lg:gap-14 lg:px-12 lg:pt-6">
          <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-[160px] md:mx-auto md:w-[560px] md:flex-none md:gap-6 md:px-0 md:pt-4 md:pb-[140px] lg:mx-0 lg:w-[480px] lg:pt-0 lg:pb-[120px]">
            <div className="flex flex-col gap-2.5 lg:hidden">
              <p className="vx-caption-medium text-muted">
                New event · {p.step} of {total}
              </p>
              <div className="flex gap-1.5" aria-hidden>
                {STEP_NAMES.map((name, i) => (
                  <span key={name} className={cx("h-1 flex-1 rounded-[2px]", i < p.step ? "bg-fg" : "bg-border")} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="vx-heading-xl text-fg">{p.title}</h1>
              {p.subtitle ? <p className="vx-body-lg text-muted">{p.subtitle}</p> : null}
            </div>
            {p.children}
          </div>
          {p.aside ? <div className="hidden xl:block">{p.aside}</div> : null}
        </div>

        {/* Action area: phone and tablet pinned with the primary button; desktop footer with Back. */}
        <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col items-stretch gap-1 border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-[104px] md:pb-8 lg:left-[272px] lg:h-[88px] lg:flex-row lg:items-center lg:gap-4 lg:px-12 lg:py-0">
          <Button type="button" variant="secondary" onClick={first ? p.onClose : p.onBack} className="max-lg:hidden">
            Back
          </Button>
          <span className="hidden flex-1 lg:block" />
          <Button type="submit" busy={p.busy} block className="lg:w-auto">
            {p.primary}
          </Button>
          {p.below ? <div className="flex h-11 items-center justify-center lg:hidden">{p.below}</div> : <span className="h-2 lg:hidden" />}
        </div>
      </div>
    </div>
  );
}
