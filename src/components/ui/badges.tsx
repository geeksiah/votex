import { cx } from "@/lib/cx";

// Figma "Code tag": contestant code, e.g. KOB14.
export function CodeTag({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-7 items-center rounded-sm bg-subtle px-2 text-[13px] leading-[1.45] font-medium tracking-[0.04em] text-fg",
        className,
      )}
    >
      {code}
    </span>
  );
}

// Figma "Status badge": event status.
export type EventStatus = "live" | "scheduled" | "paused" | "closed";

const statusStyle: Record<EventStatus, { label: string; box: string; dot: string }> = {
  live: { label: "Live", box: "bg-success-bg text-success-fg", dot: "bg-success-fg" },
  scheduled: { label: "Scheduled", box: "bg-info-bg text-info-fg", dot: "bg-info-fg" },
  paused: { label: "Paused", box: "bg-warning-bg text-warning-fg", dot: "bg-warning-fg" },
  closed: { label: "Closed", box: "bg-subtle text-muted", dot: "bg-muted" },
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const s = statusStyle[status];
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-sm px-2 vx-caption-medium", s.box, className)}>
      <span aria-hidden className={cx("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

// Figma "Event logo": accent square with initials (the event brings the colour).
export function EventLogo({ name, size = 40, className }: { name: string; size?: 32 | 40; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "inline-grid shrink-0 place-items-center bg-accent font-semibold text-on-accent",
        size === 32 ? "size-8 rounded-sm text-[11px]" : "size-10 rounded-[10px] text-[14px]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

// Votex wordmark (sign-in, platform screens).
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="grid size-7 place-items-center rounded-sm bg-primary vx-body-md-strong text-on-primary">
        V
      </span>
      <span className="vx-body-lg-strong text-fg">Votex</span>
    </span>
  );
}
