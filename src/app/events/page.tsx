import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { EventLogo, StatusBadge, type EventStatus } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { eventDateLine, type EventStatusValue } from "@/lib/event-display";
import { storageUrl } from "@/lib/event-metadata";
import { requireOrganiser, roleLabel } from "@/lib/organiser";
import { supabaseEnv } from "@/lib/supabase/env";

// O2 · Events home (approved 22 Nov 2026). Desktop 1280: 3-column cards. Tablet 1024/768: 2 columns.
// Phones: list rows with the primary action pinned at the bottom. Empty: "Create your first event".
export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  type: "paid_voting" | "election" | "free_poll";
  status: EventStatusValue;
  opens_at: string | null;
  closes_at: string | null;
  cover_path: string | null;
  logo_path: string | null;
  accent: string | null;
};

const FILTERS: { key: "all" | EventStatusValue; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Draft" },
  { key: "closed", label: "Closed" },
];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, user, role, organiser } = await requireOrganiser("/events");
  const { status } = await searchParams;
  const { data } = await supabase
    .from("events")
    .select("id, name, type, status, opens_at, closes_at, cover_path, logo_path, accent")
    .eq("tenant_id", organiser.id)
    .order("created_at", { ascending: false });
  const events = (data ?? []) as EventRow[];

  const count = (s: string) => (s === "all" ? events.length : events.filter((e) => e.status === s).length);
  const filter = FILTERS.some((f) => f.key === status) ? (status as (typeof FILTERS)[number]["key"]) : "all";
  const shown = filter === "all" ? events : events.filter((e) => e.status === filter);
  const live = count("live");
  const summary = `${events.length} ${events.length === 1 ? "event" : "events"}${live ? ` · ${live} live now` : ""}`;
  const env = supabaseEnv();
  const img = (bucket: string, path: string | null) => (path && env ? storageUrl(bucket, path, env.url) : null);
  const canCreate = role === "owner" || role === "admin";

  return (
    <DashboardShell organisation={organiser.name} person={{ email: user.email ?? "", role: roleLabel[role] }} active="events">
      {events.length === 0 ? (
        <Empty canCreate={canCreate} />
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-[120px] md:gap-5 md:px-8 md:pt-7 md:pb-10 lg:gap-6 lg:px-7 lg:pt-8 xl:px-10">
          <div className="flex items-center">
            <div className="flex flex-1 flex-col gap-1">
              <h1 className="vx-heading-xl text-fg">Events</h1>
              <p className="vx-body-md text-muted">{summary}</p>
            </div>
            {canCreate ? (
              <ButtonLink href="/events/new" size="md" className="hidden md:inline-flex">
                New event
              </ButtonLink>
            ) : null}
          </div>

          <nav aria-label="Filter events" className="hidden flex-wrap gap-2 md:flex">
            {FILTERS.map((f) => {
              const on = f.key === filter;
              return (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/events" : `/events?status=${f.key}`}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "rounded-sm px-3.5 py-2 vx-body-md-medium",
                    on ? "bg-primary text-on-primary" : "border border-border-strong text-fg hover:bg-bg",
                  )}
                >
                  {f.label} {count(f.key)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-1 flex flex-col gap-3 md:mt-0 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-3">
            {shown.map((e) => (
              <EventCard key={e.id} event={e} cover={img("event-covers", e.cover_path)} logo={img("event-logos", e.logo_path)} />
            ))}
          </div>
        </div>
      )}

      {canCreate ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg px-5 pt-4 pb-[max(34px,env(safe-area-inset-bottom))] md:hidden">
          <ButtonLink href="/events/new" block>
            New event
          </ButtonLink>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function thirdLine(e: EventRow): string {
  if (e.status === "draft") return "Finish setting up";
  // Vote and voter counts arrive with the vote ledger (build step 3).
  if (e.type === "election") return "No voters on the list yet";
  return "No votes yet";
}

function EventCard({ event: e, cover, logo }: { event: EventRow; cover: string | null; logo: string | null }) {
  const badge = (e.status === "draft" ? "draft" : e.status) as EventStatus;
  return (
    <article className="flex items-center gap-3.5 overflow-hidden rounded-md border border-border bg-surface p-3.5 md:flex-col md:items-stretch md:gap-0 md:p-0">
      {/* Phone thumbnail */}
      <div className="md:hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- organiser uploads from Storage
          <img src={cover} alt="" className="size-16 rounded-[10px] object-cover" />
        ) : (
          <EventLogo name={e.name} size={64} src={logo} accent={e.accent} />
        )}
      </div>
      {/* Tablet and desktop cover */}
      <div className="hidden h-[152px] md:block">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- organiser uploads from Storage
          <img src={cover} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-subtle">
            <EventLogo name={e.name} size={56} src={logo} accent={e.accent} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 md:gap-2 md:px-[18px] md:pt-4 md:pb-[18px]">
        <StatusBadge status={badge} />
        <h2 className="vx-body-md-strong text-fg md:vx-body-lg-strong">{e.name}</h2>
        <p className="hidden vx-body-md text-muted md:block">{eventDateLine(e)}</p>
        <p className="vx-caption text-muted md:mt-1 md:vx-body-md-medium md:text-fg">{thirdLine(e)}</p>
      </div>
      <Icon name="chevron-right" size={20} className="shrink-0 text-muted md:hidden" />
    </article>
  );
}

function Empty({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-2 px-8 pt-[120px] md:items-center md:text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-bg text-fg">
        <Icon name="calendar" size={28} />
      </span>
      <h1 className="mt-3 vx-heading-lg text-fg">Create your first event</h1>
      <p className="max-w-[420px] vx-body-lg text-muted">
        Set up voting, tickets or an election in a few minutes. You can save and finish later.
      </p>
      {canCreate ? (
        <ButtonLink href="/events/new" size="md" className="mt-4 hidden md:inline-flex">
          New event
        </ButtonLink>
      ) : null}
    </div>
  );
}
