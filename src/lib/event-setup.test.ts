import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, STEPS, roundProblems, slugFromName, type RoundDraft } from "./event-setup";

const round = (key: string, opens: string, closes: string, share: number): RoundDraft => ({
  key,
  name: key,
  mode: "public",
  opens,
  closes,
  share,
  advanceMode: "all",
  advanceCount: null,
  priceMinor: null,
});

describe("steps per event type", () => {
  it("shows only the steps each type needs", () => {
    expect(STEPS.paid_voting).toHaveLength(7);
    expect(STEPS.election).toEqual(["type", "basics", "look", "rules", "review"]);
    expect(STEPS.nominations).toHaveLength(5);
    expect(STEPS.tickets).toEqual(["type", "basics", "look", "review"]);
  });
});

describe("round checks", () => {
  it("passes one round at 100%", () => {
    expect(roundProblems([round("a", "2026-12-01T09:00", "2026-12-20T21:00", 100)])).toEqual({ total: undefined, dates: {} });
  });

  it("says how far the shares are from 100%", () => {
    const p = roundProblems([round("a", "2026-12-01T09:00", "2026-12-10T21:00", 30), round("b", "2026-12-12T09:00", "2026-12-20T21:00", 60)]);
    expect(p.total).toBe("Make the shares add up to 100%. Now 90%.");
  });

  it("finds a round that starts before the one before it closes", () => {
    const p = roundProblems([round("a", "2026-12-12T09:00", "2026-12-20T21:00", 50), round("b", "2026-12-19T09:00", "2026-12-23T21:00", 50)]);
    expect(p.dates).toEqual({ b: "overlap" });
  });
});

describe("event link from the name", () => {
  it("keeps letters and numbers, joins with dashes", () => {
    expect(slugFromName("Akoma Music Awards 2026")).toBe("akoma-music-awards-2026");
    expect(slugFromName("  Miss Côte d'Ivoire!! ")).toBe("miss-cote-d-ivoire");
    expect(SLUG_PATTERN.test(slugFromName("Ridgeview College — SRC"))).toBe(true);
  });

  it("stays within 60 characters without a trailing dash", () => {
    const s = slugFromName("a".repeat(59) + " b c");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});
