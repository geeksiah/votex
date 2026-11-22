import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTokensCss } from "../../scripts/build-tokens.mjs";
import { contrastRatio } from "@/lib/contrast";

const tokens = JSON.parse(readFileSync("design/tokens.json", "utf8"));
const resolve = (v: string): string => (v.startsWith("#") ? v : tokens.primitives[v]);

describe("design tokens", () => {
  it("tokens.css is generated from design/tokens.json (run pnpm tokens)", () => {
    expect(readFileSync("src/styles/tokens.css", "utf8").replace(/\r\n/g, "\n")).toBe(buildTokensCss(tokens));
  });

  // WCAG 2.2 AA for the text pairs used across the components, in both modes.
  const textPairs: Array<[string, string, number]> = [
    ["fg", "bg", 4.5],
    ["muted", "bg", 4.5],
    ["on-primary", "primary", 4.5],
    ["success-fg", "success-bg", 4.5],
    ["danger-fg", "danger-bg", 4.5],
    ["warning-fg", "warning-bg", 4.5],
    ["info-fg", "info-bg", 4.5],
    ["muted", "subtle", 4.5],
  ];
  // Known gap waiting for a design decision: muted (zinc-500) on subtle (zinc-100) is 4.40:1 in light mode.
  // Used by the "Closed" status badge and the empty search field. Remove from this list once fixed in Figma.
  const knownGaps = new Set(["muted/subtle/light"]);
  for (const mode of ["light", "dark"] as const) {
    for (const [fg, bg, min] of textPairs) {
      const test = knownGaps.has(`${fg}/${bg}/${mode}`) ? it.fails : it;
      test(`${fg} on ${bg} meets AA in ${mode}`, () => {
        const ratio = contrastRatio(resolve(tokens.color[fg][mode]), resolve(tokens.color[bg][mode]));
        expect(ratio).toBeGreaterThanOrEqual(min);
      });
    }
  }
});
