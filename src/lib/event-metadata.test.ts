import { describe, expect, it } from "vitest";
import { eventMetadata, type EventPreview } from "./event-metadata";

const event: EventPreview = {
  slug: "miss-ashanti-2026",
  name: "Miss Ashanti 2026",
  description: "Vote for your queen. Voting closes 14 December.",
  coverPath: "akoma/miss-ashanti 2026.jpg",
  tenantName: "Akoma Events",
};
const opts = { siteUrl: "https://vote.eventpeepo.com/", supabaseUrl: "https://abc.supabase.co" };

describe("event link previews", () => {
  it("uses the event cover and description", () => {
    const m = eventMetadata(event, opts);
    expect(m.openGraph?.url).toBe("https://vote.eventpeepo.com/miss-ashanti-2026");
    expect(m.description).toBe(event.description);
    const images = m.openGraph?.images as Array<{ url: string }>;
    expect(images[0]!.url).toBe("https://abc.supabase.co/storage/v1/object/public/event-covers/akoma/miss-ashanti%202026.jpg");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
  });

  it("falls back to a generated card and a plain description", () => {
    const m = eventMetadata({ ...event, coverPath: null, description: null }, { ...opts, path: "/results", pageTitle: "Results" });
    const images = m.openGraph?.images as Array<{ url: string }>;
    expect(images[0]!.url).toBe("https://vote.eventpeepo.com/og/event/miss-ashanti-2026");
    expect(m.description).toBe("Vote in Miss Ashanti 2026, by Akoma Events.");
    expect(m.title).toEqual({ absolute: "Results · Miss Ashanti 2026" });
    expect(m.openGraph?.url).toBe("https://vote.eventpeepo.com/miss-ashanti-2026/results");
  });
});
