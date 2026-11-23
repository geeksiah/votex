// Text shown for an event on the Events home (O2): the date line and the initials in its logo mark.

export type EventStatusValue = "draft" | "scheduled" | "live" | "paused" | "closed";

const day = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: tz }).format(d);
const dayMonth = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(d);
const dayMonthYear = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(d);
const time = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(d);
const parts = (d: Date, tz: string) => {
  const p = new Intl.DateTimeFormat("en-GB", { month: "numeric", year: "numeric", timeZone: tz }).formatToParts(d);
  return { month: p.find((x) => x.type === "month")!.value, year: p.find((x) => x.type === "year")!.value };
};

/** "6 – 30 Nov 2026", "10 Nov – 6 Dec 2026", "28 Dec 2026 – 4 Jan 2027". */
export function dateRange(opens: Date, closes: Date, tz = "Africa/Accra"): string {
  const a = parts(opens, tz);
  const b = parts(closes, tz);
  if (a.year !== b.year) return `${dayMonthYear(opens, tz)} – ${dayMonthYear(closes, tz)}`;
  if (a.month !== b.month) return `${dayMonth(opens, tz)} – ${dayMonthYear(closes, tz)}`;
  return `${day(opens, tz)} – ${dayMonthYear(closes, tz)}`;
}

/** The second line on an event card, from its status and voting window (O2). */
export function eventDateLine(
  e: { status: EventStatusValue; opens_at: string | null; closes_at: string | null },
  tz = "Africa/Accra",
): string {
  const opens = e.opens_at ? new Date(e.opens_at) : null;
  const closes = e.closes_at ? new Date(e.closes_at) : null;
  if (e.status === "draft") return "Not published";
  if (e.status === "scheduled" && opens) return `Opens ${dayMonth(opens, tz)}, ${time(opens, tz)}`;
  if (e.status === "closed" && closes) return `Ended ${dayMonthYear(closes, tz)}`;
  if (opens && closes) return dateRange(opens, closes, tz);
  if (closes) return `Closes ${dayMonthYear(closes, tz)}`;
  return "No dates set";
}

/** Up to two initials, e.g. "Akoma Events Ltd" → "AE". */
export function initials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
