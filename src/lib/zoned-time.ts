// Organisers set voting times in their own country's time; the database stores UTC.

const ZONES: Record<string, { tz: string; label: string }> = {
  GH: { tz: "Africa/Accra", label: "Ghana time (GMT)" },
  NG: { tz: "Africa/Lagos", label: "Nigeria time (WAT)" },
  KE: { tz: "Africa/Nairobi", label: "Kenya time (EAT)" },
  ZA: { tz: "Africa/Johannesburg", label: "South Africa time (SAST)" },
  CI: { tz: "Africa/Abidjan", label: "Côte d'Ivoire time (GMT)" },
};

export function countryZone(country: string) {
  return ZONES[country] ?? ZONES.GH!;
}

/** Minutes the zone is ahead of UTC at that moment. */
function offsetMinutes(at: Date, tz: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** "2026-12-01T09:00" in the zone → ISO UTC. */
export function zonedToIso(local: string, tz: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error(`Expected YYYY-MM-DDTHH:mm, got "${local}"`);
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  const first = guess - offsetMinutes(new Date(guess), tz) * 60000;
  const second = guess - offsetMinutes(new Date(first), tz) * 60000;
  return new Date(second).toISOString();
}

/** ISO UTC → "2026-12-01T09:00" in the zone (the value a datetime-local input takes). */
export function isoToZoned(iso: string, tz: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() + offsetMinutes(d, tz) * 60000);
  return local.toISOString().slice(0, 16);
}

/** "Tue 1 Dec 2026 · 9:00" (O3 Basics pickers). `year: false` gives "Tue 1 Dec · 9:00" (tablet). */
export function pickerDate(iso: string, tz: string, year = true): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" as const } : {}),
    timeZone: tz,
  })
    .format(d)
    .replace(",", "");
  const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(d);
  return `${date} · ${time.replace(/^0(\d)/, "$1")}`;
}
