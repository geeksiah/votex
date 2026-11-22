import type { Metadata } from "next";

// Link previews for every public event page (decided 22 Nov 2026): title, short description and the
// event cover. No cover yet: a generated card (logo, name, accent) served from /og/event/{slug}.

export type EventPreview = {
  slug: string;
  name: string;
  description: string | null;
  coverPath: string | null; // path inside the "event-covers" storage bucket
  tenantName: string;
};

export const COVER_BUCKET = "event-covers";
export const OG_SIZE = { width: 1200, height: 630 } as const;

export function coverUrl(coverPath: string, supabaseUrl: string): string {
  const path = coverPath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${COVER_BUCKET}/${path}`;
}

type Options = {
  siteUrl: string;
  supabaseUrl: string;
  /** Page inside the event, e.g. "/results". Defaults to the event page. */
  path?: string;
  /** Page-specific title, e.g. "Results" or a contestant's name. */
  pageTitle?: string;
};

export function eventMetadata(event: EventPreview, { siteUrl, supabaseUrl, path = "", pageTitle }: Options): Metadata {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}/${event.slug}${path}`;
  const title = pageTitle ? `${pageTitle} · ${event.name}` : event.name;
  const description = event.description?.trim() || `Vote in ${event.name}, by ${event.tenantName}.`;
  const image = event.coverPath
    ? { url: coverUrl(event.coverPath, supabaseUrl), alt: event.name }
    : { url: `${base}/og/event/${event.slug}`, ...OG_SIZE, alt: event.name };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Votex", url, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
