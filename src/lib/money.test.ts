import { describe, expect, it } from "vitest";
import { formatMoney, minorDigits, multiply, percentOf } from "./money";

describe("money", () => {
  it("formats cedis from pesewas", () => {
    expect(formatMoney({ minor: 500, currency: "GHS" }, "en-GH")).toMatch(/5\.00$/);
    expect(formatMoney({ minor: 500, currency: "GHS" }, "en-GH")).toContain("₵");
    expect(formatMoney({ minor: 123456, currency: "GHS" }, "en-GH")).toMatch(/1,234\.56$/);
  });

  it("uses each currency's own minor units", () => {
    expect(minorDigits("GHS")).toBe(2);
    expect(minorDigits("XOF")).toBe(0);
    expect(formatMoney({ minor: 1500, currency: "XOF" }, "fr-SN")).not.toContain(",00");
    expect(formatMoney({ minor: 1500, currency: "NGN" }, "en-NG")).toContain("₦");
  });

  it("rejects fractional minor units", () => {
    expect(() => formatMoney({ minor: 1.5, currency: "GHS" })).toThrow();
    expect(() => multiply({ minor: 100, currency: "GHS" }, 2.5)).toThrow();
  });

  it("multiplies price by votes in integers", () => {
    expect(multiply({ minor: 100, currency: "GHS" }, 50)).toEqual({ minor: 5000, currency: "GHS" });
  });

  it("takes percentages with half-up rounding in minor units", () => {
    expect(percentOf(1000, 500)).toBe(50); // 5% of GH₵10.00
    expect(percentOf(150, 500)).toBe(8); // 7.5 pesewas → 8
    expect(percentOf(149, 500)).toBe(7); // 7.45 → 7
    expect(percentOf(0, 500)).toBe(0);
    expect(() => percentOf(100, 10_001)).toThrow();
  });
});
