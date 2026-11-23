import { describe, expect, it } from "vitest";
import { isoToZoned, pickerDate, zonedToIso } from "./zoned-time";

describe("zoned time", () => {
  it("converts organiser time to UTC and back", () => {
    expect(zonedToIso("2026-12-01T09:00", "Africa/Accra")).toBe("2026-12-01T09:00:00.000Z");
    expect(zonedToIso("2026-12-01T09:00", "Africa/Lagos")).toBe("2026-12-01T08:00:00.000Z");
    expect(zonedToIso("2026-12-01T09:00", "Africa/Nairobi")).toBe("2026-12-01T06:00:00.000Z");
    expect(isoToZoned("2026-12-01T08:00:00.000Z", "Africa/Lagos")).toBe("2026-12-01T09:00");
  });

  it("formats the picker value like the design", () => {
    expect(pickerDate("2026-12-01T09:00:00Z", "Africa/Accra")).toBe("Tue 1 Dec 2026 · 9:00");
    expect(pickerDate("2026-12-20T21:00:00Z", "Africa/Accra")).toBe("Sun 20 Dec 2026 · 21:00");
    expect(pickerDate("2026-12-01T09:00:00Z", "Africa/Accra", false)).toBe("Tue 1 Dec · 9:00");
  });
});
