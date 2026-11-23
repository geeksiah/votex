// Shared rules for the create-event wizard (O3).

export type WizardType = "paid_voting" | "election" | "nominations" | "tickets";

export const TYPE_LABEL: Record<WizardType, string> = {
  paid_voting: "Awards",
  election: "Election",
  nominations: "Nominations",
  tickets: "Tickets",
};

/** Only paid voting has a price per vote; other types skip step 6. */
export const hasPrice = (t: WizardType) => t === "paid_voting";

/**
 * Example fee (payment + Votex service) until the client sets real pricing (build plan "Numbers").
 * Shown to organisers as "Payment and service fees" on the price step.
 */
export const EXAMPLE_FEE_BASIS_POINTS = 1000;

export const DEFAULT_QUICK_PICKS = [1, 10, 50, 100];

/** "Akoma Music Awards 2026" → "akoma-music-awards-2026" (letters, numbers and dashes, at most 60). */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
