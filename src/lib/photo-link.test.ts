import { describe, expect, it } from "vitest";
import { safePhotoUrl } from "./photo-link";

describe("photo links from a CSV", () => {
  it("accepts https links to public sites and turns Drive links into downloads", () => {
    expect(safePhotoUrl("https://akomaevents.com/photos/kobby.jpg")?.toString()).toBe("https://akomaevents.com/photos/kobby.jpg");
    expect(safePhotoUrl("https://drive.google.com/file/d/1AbC-xyz_9/view?usp=sharing")?.toString()).toBe(
      "https://drive.google.com/uc?export=download&id=1AbC-xyz_9",
    );
  });

  it("refuses anything that could reach a private machine", () => {
    for (const bad of [
      "http://akomaevents.com/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://169.254.169.254/latest",
      "https://[::1]/a.jpg",
      "https://localhost/a.jpg",
      "https://printer.local/a.jpg",
      "https://intranet/a.jpg",
      "https://user:pass@akomaevents.com/a.jpg",
      "https://akomaevents.com:8443/a.jpg",
      "file:///etc/passwd",
      "not a link",
    ]) {
      expect(safePhotoUrl(bad), bad).toBeNull();
    }
  });
});
