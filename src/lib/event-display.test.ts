import { describe, expect, it } from "vitest";
import { dateRange, eventDateLine, initials } from "./event-display";

describe("event date line", () => {
  it("shows a range inside one month, across months and across years", () => {
    expect(dateRange(new Date("2026-11-06T08:00:00Z"), new Date("2026-11-30T20:00:00Z"))).toBe("6 – 30 Nov 2026");
    expect(dateRange(new Date("2026-11-10T08:00:00Z"), new Date("2026-12-06T20:00:00Z"))).toBe("10 Nov – 6 Dec 2026");
    expect(dateRange(new Date("2026-12-28T08:00:00Z"), new Date("2027-01-04T20:00:00Z"))).toBe("28 Dec 2026 – 4 Jan 2027");
  });

  it("follows the status", () => {
    const base = { opens_at: "2026-11-28T08:00:00Z", closes_at: "2026-12-14T20:00:00Z" };
    expect(eventDateLine({ ...base, status: "draft" })).toBe("Not published");
    expect(eventDateLine({ ...base, status: "scheduled" })).toBe("Opens 28 Nov, 08:00");
    expect(eventDateLine({ ...base, status: "closed" })).toBe("Ended 14 Dec 2026");
    expect(eventDateLine({ ...base, status: "live" })).toBe("28 Nov – 14 Dec 2026");
    expect(eventDateLine({ status: "live", opens_at: null, closes_at: null })).toBe("No dates set");
  });

  it("uses the organiser's time zone", () => {
    expect(eventDateLine({ status: "scheduled", opens_at: "2026-11-28T07:00:00Z", closes_at: null }, "Africa/Lagos")).toBe(
      "Opens 28 Nov, 08:00",
    );
  });
});

describe("initials", () => {
  it("takes up to two", () => {
    expect(initials("Akoma Events Ltd")).toBe("AE");
    expect(initials("Ridgeview")).toBe("R");
    expect(initials("kofi.boateng@akomaevents.com")).toBe("KB");
  });
});
