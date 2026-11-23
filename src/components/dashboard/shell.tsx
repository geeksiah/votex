import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { SidebarPerson, TopBarPerson } from "./account-menu";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/event-display";

// Organiser dashboard frame (Figma O2/O4). Desktop 1280: 248 side menu. Tablet 1024: 220 side menu.
// Tablet 768 and phones: top bar with the organisation and the signed-in person.
type NavKey = "events" | "finance" | "team" | "settings";

const NAV: { key: NavKey; label: string; icon: IconName; href?: string }[] = [
  { key: "events", label: "Events", icon: "calendar", href: "/events" },
  // Finance, Team and Settings are built in later steps; until then they show but do not open.
  { key: "finance", label: "Finance", icon: "wallet" },
  { key: "team", label: "Team", icon: "users" },
  { key: "settings", label: "Settings", icon: "settings" },
];

type ShellProps = {
  organisation: string;
  person: { email: string; role: string };
  active: NavKey;
  children: ReactNode;
};

export function DashboardShell({ organisation, person, active, children }: ShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-subtle lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col gap-0.5 border-r border-border bg-bg px-4 py-5 lg:flex xl:w-[248px]">
        <div className="flex items-center gap-2.5 pb-5 pl-2">
          <OrgMark name={organisation} size={28} />
          <span className="truncate vx-body-md-strong text-fg">{organisation}</span>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const isActive = item.key === active;
            const body = (
              <>
                <Icon name={item.icon} size={20} />
                <span className="flex-1">{item.label}</span>
              </>
            );
            const cls = cx(
              "flex h-10 items-center gap-3 rounded-sm px-3",
              isActive ? "bg-subtle vx-body-md-strong text-fg" : "vx-body-md-medium text-muted",
            );
            return item.href ? (
              <Link key={item.key} href={item.href} aria-current={isActive ? "page" : undefined} className={cx(cls, !isActive && "hover:bg-subtle hover:text-fg")}>
                {body}
              </Link>
            ) : (
              <span key={item.key} aria-disabled="true" title="Coming soon" className={cx(cls, "cursor-default opacity-40")}>
                {body}
              </span>
            );
          })}
        </nav>
        <span className="flex-1" />
        <SidebarPerson person={{ name: null, ...person }} />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-2.5 border-b border-border bg-bg px-5 lg:hidden">
        <OrgMark name={organisation} size={32} />
        <span className="flex-1 truncate vx-body-md-strong text-fg">{organisation}</span>
        <TopBarPerson person={{ name: null, ...person }} />
      </header>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

function OrgMark({ name, size }: { name: string; size: 28 | 32 }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-sm bg-primary vx-caption-strong text-on-primary",
        size === 28 ? "size-7" : "size-8",
      )}
    >
      {initials(name)}
    </span>
  );
}
