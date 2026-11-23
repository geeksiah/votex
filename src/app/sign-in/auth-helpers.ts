// Pure helpers for the sign-in flow (unit tested).

export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/** Only same-site paths are allowed after sign-in, so a link cannot send people to another site. */
export function safeNext(next: string | undefined | null): string {
  // Browsers drop tabs and newlines before parsing, so "/\t/evil.com" becomes "//evil.com".
  // Reject control characters and backslashes outright, then confirm the path stays on this site.
  if (!next || !next.startsWith("/") || /[\x00-\x1F\x7F\\]/.test(next)) return "/";
  const base = "http://votex.invalid";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

/** Plain-language messages for Supabase Auth errors. Never blames the person. */
export function authErrorMessage(error: { status?: number; code?: string; message?: string }): string {
  const code = error.code ?? "";
  // One email per address per minute: Supabase says "…you can only request this after 45 seconds."
  if (code === "over_email_send_rate_limit") {
    const seconds = Number(/after (\d+) seconds?/i.exec(error.message ?? "")?.[1]);
    return seconds > 0 ? `Wait ${seconds} seconds, then send a new code.` : "Wait a minute, then send a new code.";
  }
  if (error.status === 429 || code === "over_request_rate_limit") {
    return "Too many tries. Wait a minute, then try again.";
  }
  if (code === "otp_expired" || code === "invalid_credentials" || /expired|invalid/i.test(error.message ?? "")) {
    return "This code is wrong or has expired. Check it, or send a new code.";
  }
  if (code === "email_address_invalid") return "Enter your email, like kofi@akomaevents.com";
  return "Something went wrong on our side. Try again.";
}
