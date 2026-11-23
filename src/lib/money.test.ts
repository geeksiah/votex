import { describe, expect, it } from "vitest";
import { formatMoney, minorDigits, multiply, parseMoney, percentOf } from "./money";

describe("design format and typed amounts", () => {
  it("writes a space after a leading symbol, like the designs", () => {
    expect(formatMoney({ minor: 100, currency: "GHS" }, "en-GH")).toBe("GH₵ 1.00");
    expect(formatMoney({ minor: 4821000, currency: "GHS" }, "en-GH")).toBe("GH₵ 48,210.00");
  });

  it("reads what organisers type", () => {
    expect(parseMoney("1", "GHS")).toBe(100);
    expect(parseMoney("1.5", "GHS")).toBe(150);
    expect(parseMoney("GH₵ 1.00", "GHS")).toBe(100);
    expect(parseMoney("1,000", "GHS")).toBe(100000);
    expect(parseMoney("1.005", "GHS")).toBeNull();
    expect(parseMoney("", "GHS")).toBeNull();
    expect(parseMoney("500", "XOF")).toBe(500);
  });
});

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
