import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugFromName } from "./event-setup";

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
