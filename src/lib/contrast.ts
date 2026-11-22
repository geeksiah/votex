// Event accents are set by organisers. Text on the accent is black or white, whichever contrasts more,
// and accents that cannot reach WCAG AA for their use are rejected (master plan §2, "Colour").

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Colour must be a 6-digit hex like #c2410c, got "${hex}"`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white text on the accent, whichever has more contrast. */
export function onAccent(accent: string): "#ffffff" | "#000000" {
  return contrastRatio(accent, "#ffffff") >= contrastRatio(accent, "#000000") ? "#ffffff" : "#000000";
}

/** AA: 4.5 for normal text (labels on the accent), 3 for large text and UI marks (focus, selected). */
export function accentPassesAA(accent: string, use: "text" | "ui" = "text"): boolean {
  const min = use === "text" ? 4.5 : 3;
  return contrastRatio(accent, onAccent(accent)) >= min;
}
