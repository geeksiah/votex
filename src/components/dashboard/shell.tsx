import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
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
  const who = initials(person.email.split("@")[0] ?? person.email);
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
              <span key={item.key} aria-disabled="true" className={cls}>
                {body}
              </span>
            );
          })}
        </nav>
        <span className="flex-1" />
        <PersonMenu who={who} person={person} align="up" />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-2.5 border-b border-border bg-bg px-5 lg:hidden">
        <OrgMark name={organisation} size={32} />
        <span className="flex-1 truncate vx-body-md-strong text-fg">{organisation}</span>
        <PersonMenu who={who} person={person} align="down" compact />
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

// The signed-in person. Opens a small menu with Sign out.
function PersonMenu({
  who,
  person,
  align,
  compact,
}: {
  who: string;
  person: { email: string; role: string };
  align: "up" | "down";
  compact?: boolean;
}) {
  return (
    <details className="group relative">
      <summary
        className={cx(
          "flex list-none items-center gap-2.5 rounded-sm [&::-webkit-details-marker]:hidden",
          compact ? "" : "py-1 pl-2 hover:bg-subtle",
        )}
        aria-label={compact ? `${person.email}, open menu` : undefined}
      >
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle vx-caption-strong text-muted">
          {who}
        </span>
        {compact ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate vx-body-md-medium text-fg">{person.email}</span>
            <span className="vx-caption text-muted">{person.role}</span>
          </span>
        )}
      </summary>
      <div
        className={cx(
          "absolute z-30 w-56 rounded-md border border-border bg-bg p-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]",
          align === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
        )}
      >
        {compact ? (
          <p className="truncate px-3 py-2 vx-caption text-muted">
            {person.email} · {person.role}
          </p>
        ) : null}
        <form action="/sign-out" method="post">
          <button type="submit" className="flex h-10 w-full items-center rounded-sm px-3 text-left vx-body-md-medium text-fg hover:bg-subtle">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
