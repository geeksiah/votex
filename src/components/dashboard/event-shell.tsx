"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EventLogo, StatusBadge, type EventStatus } from "@/components/ui/badges";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/event-display";
import { SidebarPerson } from "./account-menu";

// Pages inside one event (Figma O6/O7 frames). Desktop: side menu with the organisation, "All events",
// the event and its sections. Tablet 768: event top bar with tabs. Phone: event top bar and a bottom tab bar.
export type EventSection = "overview" | "categories" | "contestants";

type Item = { key: string; label: string; icon: IconName; href?: string };

type Props = {
  organisation: string;
  person: { email: string; role: string };
  event: { id: string; name: string; status: string; accent: string | null; logoUrl: string | null };
  active: EventSection;
  children: ReactNode;
  /**
   * The page draws its own top bar: true on phones (e.g. contestants of one category), "touch" on phones
   * and tablets (e.g. the CSV import, a full-screen flow).
   */
  bare?: boolean | "touch";
};

const badge = (s: string) => s as EventStatus;

export function EventShell({ organisation, person, event, active, children, bare }: Props) {
  const base = `/events/${event.id}`;
  // Sections are links once they are built; the rest show where they will be.
  const items: Item[] = [
    { key: "overview", label: "Overview", icon: "home" },
    { key: "categories", label: "Categories", icon: "list", href: `${base}/categories` },
    { key: "contestants", label: "Contestants", icon: "users", href: `${base}/contestants` },
    { key: "nominations", label: "Nominations", icon: "check" },
    { key: "judges", label: "Judges", icon: "chart" },
    { key: "rules", label: "Voting rules", icon: "settings" },
    { key: "tickets", label: "Tickets", icon: "ticket" },
    { key: "transactions", label: "Transactions", icon: "list" },
    { key: "finance", label: "Finance", icon: "wallet" },
    { key: "share", label: "Share & embed", icon: "share" },
    { key: "team", label: "Team", icon: "users" },
    { key: "activity", label: "Activity", icon: "alert" },
  ];
  const tabs = ["overview", "categories", "contestants", "tickets", "money", "more"];
  const tabLabel: Record<string, string> = { overview: "Overview", categories: "Categories", contestants: "Contestants", tickets: "Tickets", money: "Money", more: "More" };
  const tabHref: Record<string, string | undefined> = { categories: `${base}/categories`, contestants: `${base}/contestants` };
  const phoneTabs: { key: string; label: string; icon: IconName }[] = [
    { key: "overview", label: "Overview", icon: "home" },
    { key: "categories", label: "Categories", icon: "list" },
    { key: "money", label: "Money", icon: "wallet" },
    { key: "more", label: "More", icon: "more" },
  ];
  const [more, setMore] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-bg md:bg-subtle lg:flex-row">
      {/* Desktop side menu */}
      <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-bg px-4 py-5 lg:flex xl:w-[248px]">
        <div className="flex items-center gap-2.5 pb-4 pl-2">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-sm bg-primary vx-caption-strong text-on-primary">
            {initials(organisation)}
          </span>
          <span className="truncate vx-body-md-strong text-fg">{organisation}</span>
        </div>
        <Link href="/events" className="flex items-center gap-1.5 pb-3 pl-2 vx-caption-medium text-muted hover:text-fg">
          <Icon name="chevron-left" size={16} />
          All events
        </Link>
        <div className="flex items-center gap-2.5 pb-4 pl-2">
          <EventLogo name={event.name} size={32} src={event.logoUrl} accent={event.accent} />
          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="max-w-full truncate vx-body-md-strong text-fg">{event.name}</span>
            <StatusBadge status={badge(event.status)} />
          </div>
        </div>
        <nav aria-label="Event" className="flex flex-col gap-0.5">
          {items.map((it) => {
            const on = it.key === active;
            const cls = cx("flex h-10 items-center gap-3 rounded-sm px-3", on ? "bg-subtle vx-body-md-strong text-fg" : "vx-body-md-medium text-muted");
            const body = (
              <>
                <Icon name={it.icon} size={20} />
                <span className="flex-1">{it.label}</span>
              </>
            );
            return it.href ? (
              <Link key={it.key} href={it.href} aria-current={on ? "page" : undefined} className={cx(cls, !on && "hover:bg-subtle hover:text-fg")}>
                {body}
              </Link>
            ) : (
              <span key={it.key} aria-disabled="true" title="Coming soon" className={cx(cls, "cursor-default opacity-40")}>
                {body}
              </span>
            );
          })}
        </nav>
        <span className="min-h-6 flex-1" />
        <SidebarPerson person={{ name: null, ...person }} />
      </aside>

      {/* Tablet top bar and tabs */}
      <div className={cx("sticky top-0 z-20 hidden flex-col bg-bg md:flex lg:hidden", bare === "touch" && "md:hidden")}>
        <header className="flex h-16 items-center gap-3 px-6">
          <Link href="/events" aria-label="All events" className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="chevron-left" size={22} />
          </Link>
          <EventLogo name={event.name} size={32} src={event.logoUrl} accent={event.accent} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate vx-body-md-strong text-fg">{event.name}</span>
            <span className="truncate vx-caption text-muted">{organisation}</span>
          </span>
          <StatusBadge status={badge(event.status)} />
        </header>
        <nav aria-label="Event" className="flex gap-6 border-b border-border pl-6">
          {tabs.map((t) => {
            const on = t === active;
            const cls = cx("flex flex-col gap-2.5 pt-3", on ? "vx-body-md-strong text-fg" : "vx-body-md-medium text-muted");
            const body = (
              <>
                {tabLabel[t]}
                <span className={cx("h-0.5 w-full", on && "bg-fg")} />
              </>
            );
            return tabHref[t] ? (
              <Link key={t} href={tabHref[t]!} aria-current={on ? "page" : undefined} className={cx(cls, !on && "hover:text-fg")}>
                {body}
              </Link>
            ) : (
              <span key={t} aria-disabled="true" className={cx(cls, "cursor-default opacity-40")}>
                {body}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Phone top bar */}
      <header className={cx("sticky top-0 z-20 flex h-[60px] items-center gap-2.5 border-b border-border bg-bg px-5 md:hidden", bare && "max-md:hidden")}>
        <EventLogo name={event.name} size={32} src={event.logoUrl} accent={event.accent} />
        <span className="flex-1 truncate vx-body-md-strong text-fg">{event.name}</span>
        <button type="button" aria-label="More" onClick={() => setMore(true)} className="-mr-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
          <Icon name="more" size={22} />
        </button>
      </header>

      <main className={cx("flex min-w-0 flex-1 flex-col md:pb-0", bare ? "pb-8" : "pb-24")}>{children}</main>

      {/* Phone tab bar */}
      <nav aria-label="Event" className={cx("fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-bg pt-2 pb-[max(28px,env(safe-area-inset-bottom))] md:hidden", bare && "max-md:hidden")}>
        {phoneTabs.map((t) => {
          const on = t.key === active || (t.key === "categories" && active === "contestants");
          const href = t.key === "categories" ? `${base}/categories` : undefined;
          const cls = cx("flex flex-1 flex-col items-center gap-1 py-1.5", on ? "text-fg" : "text-faint");
          const body = (
            <>
              <Icon name={t.icon} size={24} />
              <span className={cx(on ? "vx-caption-strong text-fg" : "vx-caption-medium text-muted")}>{t.label}</span>
            </>
          );
          if (t.key === "more")
            return (
              <button key={t.key} type="button" onClick={() => setMore(true)} className={cls}>
                {body}
              </button>
            );
          return href ? (
            <Link key={t.key} href={href} aria-current={on ? "page" : undefined} className={cls}>
              {body}
            </Link>
          ) : (
            <span key={t.key} aria-disabled="true" className={cx(cls, "opacity-40")}>
              {body}
            </span>
          );
        })}
      </nav>

      {more ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button type="button" aria-label="Close" onClick={() => setMore(false)} className="absolute inset-0 bg-fg/40" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 rounded-t-[20px] bg-bg px-4 pt-2 pb-[max(34px,env(safe-area-inset-bottom))]">
            <span aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-border-strong" />
            <Link href="/events" className="flex h-12 items-center gap-3 rounded-sm px-3 vx-body-lg-medium text-fg hover:bg-subtle">
              <Icon name="chevron-left" size={20} />
              All events
            </Link>
            <Link href={`${base}/categories`} className="flex h-12 items-center gap-3 rounded-sm px-3 vx-body-lg-medium text-fg hover:bg-subtle">
              <Icon name="list" size={20} />
              Categories
            </Link>
            <Link href={`${base}/contestants`} className="flex h-12 items-center gap-3 rounded-sm px-3 vx-body-lg-medium text-fg hover:bg-subtle">
              <Icon name="users" size={20} />
              Contestants
            </Link>
            <Link href={`${base}/contestants/import`} className="flex h-12 items-center gap-3 rounded-sm px-3 vx-body-lg-medium text-fg hover:bg-subtle">
              <Icon name="arrow-up" size={20} />
              Import contestants
            </Link>
            <form action="/sign-out" method="post">
              <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-sm px-3 text-left vx-body-lg-medium text-fg hover:bg-subtle">
                <Icon name="sign-out" size={20} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
