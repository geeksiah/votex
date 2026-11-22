import type { Metadata } from "next";

// Link previews (master plan §2, "Images and link previews", decided 22 Nov 2026):
// - every public event page: title, short description and the event cover;
// - contestant pages and links: the contestant's photo, name and code;
// - no image set: the event cover, then a generated card (logo, name, accent) from /og/event/{slug}.
// A cover is optional; publishing never waits for one.

export type EventPreview = {
  slug: string;
  name: string;
  description: string | null;
  coverPath: string | null; // path inside the "event-covers" storage bucket
  tenantName: string;
};

export type ContestantPreview = {
  code: string;
  name: string;
  photoPath: string | null; // path inside the "contestant-photos" storage bucket
};

export const COVER_BUCKET = "event-covers";
export const PHOTO_BUCKET = "contestant-photos";
export const OG_SIZE = { width: 1200, height: 630 } as const;

export function storageUrl(bucket: string, path: string, supabaseUrl: string): string {
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${safePath}`;
}

type Options = {
  siteUrl: string;
  supabaseUrl: string;
  /** Page inside the event, e.g. "/results". Defaults to the event page. */
  path?: string;
  /** Page-specific title, e.g. "Results". */
  pageTitle?: string;
  /** Set on a contestant's own page so the preview shows them. */
  contestant?: ContestantPreview;
};

export function eventMetadata(event: EventPreview, { siteUrl, supabaseUrl, path = "", pageTitle, contestant }: Options): Metadata {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}/${event.slug}${path}`;
  const heading = contestant ? `${contestant.name} (${contestant.code})` : pageTitle;
  const title = heading ? `${heading} · ${event.name}` : event.name;
  const description = contestant
    ? `Vote for ${contestant.name} in ${event.name}. Code ${contestant.code}.`
    : event.description?.trim() || `Vote in ${event.name}, by ${event.tenantName}.`;

  const alt = contestant ? contestant.name : event.name;
  const image = contestant?.photoPath
    ? { url: storageUrl(PHOTO_BUCKET, contestant.photoPath, supabaseUrl), alt }
    : event.coverPath
      ? { url: storageUrl(COVER_BUCKET, event.coverPath, supabaseUrl), alt }
      : { url: `${base}/og/event/${event.slug}`, ...OG_SIZE, alt };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Votex", url, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
