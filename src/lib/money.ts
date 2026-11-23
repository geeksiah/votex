// Money is always an integer in minor units plus an ISO 4217 code (master plan §5, "Currency").
// No symbol, decimal rule or "GH₵" string is hardcoded: formatting comes from Intl.

export type Money = { minor: number; currency: string };

const digitsCache = new Map<string, number>();

/** Number of minor-unit digits for a currency (GHS 2, XOF 0, …). */
export function minorDigits(currency: string): number {
  const code = currency.toUpperCase();
  let d = digitsCache.get(code);
  if (d === undefined) {
    d = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
    digitsCache.set(code, d);
  }
  return d;
}

export function assertMinor(minor: number): void {
  if (!Number.isSafeInteger(minor)) throw new Error(`Amount must be a whole number of minor units, got ${minor}`);
}

/** Format for display, e.g. formatMoney({minor: 500, currency: "GHS"}, "en-GH") → "GH₵5.00". */
export function formatMoney({ minor, currency }: Money, locale = "en-GH"): string {
  assertMinor(minor);
  const digits = minorDigits(currency);
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(minor / 10 ** digits);
  // Designs write "GH₵ 1.00": a space after a symbol that comes first. Locales that already space it are left alone.
  const out = parts.map((p) => p.value);
  const i = parts.findIndex((p) => p.type === "currency");
  if (i === 0 && parts[1] && parts[1].type !== "literal") out[0] = `${out[0]} `;
  if (i === 1 && parts[0]?.type === "minusSign" && parts[2] && parts[2].type !== "literal") out[1] = `${out[1]} `;
  return out.join("");
}

/** Amount typed by an organiser ("1", "1.5", "GH₵ 1.00", "1,000") to minor units, or null when unreadable. */
export function parseMoney(input: string, currency: string): number | null {
  const digits = minorDigits(currency);
  const cleaned = input.replace(/[^\d.]/g, "");
  if (!/^\d+(\.\d*)?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  if (frac.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number((frac + "0".repeat(digits)).slice(0, digits) || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Price per vote × votes, staying in integers. */
export function multiply({ minor, currency }: Money, quantity: number): Money {
  assertMinor(minor);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error(`Quantity must be a whole number, got ${quantity}`);
  const total = minor * quantity;
  assertMinor(total);
  return { minor: total, currency };
}

/**
 * Percentage of an amount in minor units, rounded half up to the nearest minor unit.
 * `basisPoints` avoids floats: 500 = 5%.
 */
export function percentOf(minor: number, basisPoints: number): number {
  assertMinor(minor);
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error(`Basis points must be 0–10000, got ${basisPoints}`);
  }
  return Math.floor((minor * basisPoints + 5_000) / 10_000);
}
