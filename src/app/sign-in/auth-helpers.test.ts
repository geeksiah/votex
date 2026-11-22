import { describe, expect, it } from "vitest";
import { authErrorMessage, isValidEmail, normaliseEmail, safeNext } from "./auth-helpers";

describe("sign-in helpers", () => {
  it("normalises and checks emails", () => {
    expect(normaliseEmail("  Kofi@AkomaEvents.com ")).toBe("kofi@akomaevents.com");
    expect(isValidEmail("kofi@akomaevents.com")).toBe(true);
    expect(isValidEmail("kofi@akoma")).toBe(false);
    expect(isValidEmail("kofi akoma@x.com")).toBe(false);
  });

  it("only returns to same-site paths", () => {
    expect(safeNext("/events/miss-ashanti")).toBe("/events/miss-ashanti");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("/\t/evil.example")).toBe("/");
    expect(safeNext("/\n/evil.example")).toBe("/");
    expect(safeNext("/%2F/evil.example")).toBe("/%2F/evil.example"); // stays a path on this site
    expect(safeNext("/results?tab=top#3")).toBe("/results?tab=top#3");
    expect(safeNext(undefined)).toBe("/");
  });

  it("maps auth errors to plain language", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/^Too many tries/);
    expect(authErrorMessage({ code: "otp_expired" })).toMatch(/wrong or has expired/);
    expect(authErrorMessage({ message: "boom" })).toBe("Something went wrong on our side. Try again.");
  });
});
