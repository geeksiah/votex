"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

// Shell · Account and sign out (approved 23 Nov 2026). Sign out lives on the person, never in the main menu.
// Desktop: the name block at the bottom of the side menu opens a small menu above it.
// Tablet: the avatar opens the menu below it. Phone: the avatar opens a sheet with one Sign out button.
// No name yet: the email (cut off with … if long) and its first letter in the avatar.

type Person = { name: string | null; email: string; role: string };

const letters = (p: Person) =>
  p.name
    ? p.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join("")
    : (p.email[0] ?? "").toUpperCase();

function SignOut({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <form action="/sign-out" method="post" className={className}>
      {children}
    </form>
  );
}

function MenuCard({ person, className }: { person: Person; className?: string }) {
  return (
    <div role="menu" className={cx("w-[215px] rounded-md border border-border bg-bg p-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]", className)}>
      <div className="flex flex-col gap-0.5 px-3 pt-2.5 pb-3">
        {person.name ? <p className="truncate vx-body-md-strong text-fg">{person.name}</p> : null}
        <p className={cx("truncate", person.name ? "vx-caption text-muted" : "vx-body-md-strong text-fg")}>{person.email}</p>
      </div>
      <div className="h-px bg-border" />
      <SignOut className="pt-1">
        <button type="submit" role="menuitem" className="flex h-10 w-full items-center gap-3 rounded-sm px-3 text-left vx-body-md-medium text-fg hover:bg-subtle">
          <Icon name="sign-out" size={20} />
          Sign out
        </button>
      </SignOut>
    </div>
  );
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Desktop side menu: the person block, opening the menu above it. */
export function SidebarPerson({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      {open ? <MenuCard person={person} className="absolute bottom-full left-0 mb-2" /> : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx("flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left hover:bg-subtle", open && "bg-subtle")}
      >
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle vx-caption-strong text-muted">
          {letters(person)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate vx-body-md-medium text-fg">{person.name ?? person.email}</span>
          <span className="vx-caption text-muted">{person.role}</span>
        </span>
        <Icon name="chevron-right" size={16} className={cx("shrink-0 text-muted transition-transform duration-150", open && "-rotate-90")} />
      </button>
    </div>
  );
}

/** Tablet and phone top bar: the avatar. Tablet opens the menu below; phone opens a sheet. */
export function TopBarPerson({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${person.name ?? person.email}, open menu`}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-full bg-subtle vx-caption-strong text-muted"
      >
        {letters(person)}
      </button>
      {open ? (
        <>
          <MenuCard person={person} className="absolute top-full right-0 z-30 mt-2 hidden md:block" />
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Account">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-fg/40" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[20px] bg-bg px-6 pt-2 pb-[max(34px,env(safe-area-inset-bottom))] shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
              <span aria-hidden className="mx-auto h-1 w-9 rounded-[2px] bg-border-strong" />
              <div className="mt-5 flex items-center gap-3.5">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-subtle vx-body-md-strong text-fg">
                  {letters(person)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate vx-body-lg-strong text-fg">{person.name ?? person.email}</span>
                  {person.name ? <span className="truncate vx-body-md text-muted">{person.email}</span> : <span className="vx-body-md text-muted">{person.role}</span>}
                </span>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="-mr-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
                  <Icon name="close" />
                </button>
              </div>
              <SignOut className="mt-6">
                <Button type="submit" variant="secondary" block>
                  <Icon name="sign-out" size={20} />
                  Sign out
                </Button>
              </SignOut>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
