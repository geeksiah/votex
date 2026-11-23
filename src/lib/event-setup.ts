// Shared rules for the create-event wizard (O3).

export type WizardType = "paid_voting" | "election" | "nominations" | "tickets";

export const TYPE_LABEL: Record<WizardType, string> = {
  paid_voting: "Awards",
  election: "Election",
  nominations: "Nominations only",
  tickets: "Tickets only",
};

/** Wizard steps per event type (Figma "O3 · By event type", approved 23 Nov 2026). */
export type StepKey = "type" | "basics" | "look" | "rounds" | "rules" | "price" | "review";

export const STEP_LABEL: Record<StepKey, string> = {
  type: "Type",
  basics: "Basics",
  look: "Look",
  rounds: "Rounds",
  rules: "Rules",
  price: "Price",
  review: "Review",
};

export const STEPS: Record<WizardType, StepKey[]> = {
  paid_voting: ["type", "basics", "look", "rounds", "rules", "price", "review"],
  election: ["type", "basics", "look", "rules", "review"],
  nominations: ["type", "basics", "look", "rules", "review"],
  tickets: ["type", "basics", "look", "review"],
};

/** Only paid voting has a price per vote. */
export const hasPrice = (t: WizardType) => t === "paid_voting";

export const VOTER_SIGN_IN: { value: string; label: string; short: string }[] = [
  { value: "member_id_email", label: "Member ID and email code", short: "Member ID and email code" },
  { value: "member_id_phone", label: "Member ID and phone code", short: "Member ID and phone code" },
  { value: "email", label: "Email code", short: "Email code" },
  { value: "phone", label: "Phone code", short: "Phone code" },
];

export const NOMINATORS: { value: string; label: string; short: string }[] = [
  { value: "anyone_code", label: "Anyone, with a phone or email code", short: "Anyone, with a code" },
  { value: "invited", label: "Only people I invite", short: "Only people I invite" },
];

// Rounds (Figma "O5 · Rounds").
export type RoundMode = "public" | "judges";
export type AdvanceMode = "all" | "top" | "pick";

export type RoundDraft = {
  key: string;
  name: string;
  mode: RoundMode;
  /** datetime-local values in the organiser's time zone. */
  opens: string;
  closes: string;
  share: number;
  advanceMode: AdvanceMode;
  advanceCount: number | null;
  priceMinor: number | null;
};

/** Problems that stop Continue on the rounds step, in the order the design shows them. */
export function roundProblems(rounds: RoundDraft[]): { total?: string; dates: Record<string, string> } {
  const dates: Record<string, string> = {};
  rounds.forEach((r, i) => {
    if (!r.opens || !r.closes) dates[r.key] = "Choose when this round opens and closes";
    else if (r.closes <= r.opens) dates[r.key] = "The round must close after it opens";
    else if (i > 0 && rounds[i - 1]!.closes && r.opens < rounds[i - 1]!.closes) dates[r.key] = "overlap";
  });
  const sum = rounds.reduce((s, r) => s + (Number.isFinite(r.share) ? r.share : 0), 0);
  return { total: sum === 100 ? undefined : `Make the shares add up to 100%. Now ${sum}%.`, dates };
}

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
