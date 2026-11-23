/** "votex.eventpeepo.com": the host event links are shown with (no scheme, no trailing slash). */
export function siteHost(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://votex.eventpeepo.com";
  try {
    return new URL(url).host;
  } catch {
    return "votex.eventpeepo.com";
  }
}
