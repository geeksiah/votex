import { describe, expect, it } from "vitest";
import { accentPassesAA, contrastRatio, onAccent } from "./contrast";

describe("contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#71717a", "#ffffff")).toBeGreaterThan(4.5); // muted text on white
  });

  it("picks white or black text on the accent", () => {
    expect(onAccent("#c2410c")).toBe("#ffffff"); // Figma example accent
    expect(onAccent("#fde047")).toBe("#000000"); // yellow
  });

  it("checks accents against AA", () => {
    expect(accentPassesAA("#c2410c")).toBe(true);
    expect(accentPassesAA("#808080", "ui")).toBe(true);
    expect(() => accentPassesAA("red")).toThrow();
  });
});
