import type { Metadata } from "next";
import { storageUrl } from "@/lib/event-metadata";
import { requireOrganiser, roleLabel } from "@/lib/organiser";
import { supabaseEnv } from "@/lib/supabase/env";
import { EventsView, parseFilter, type EventListItem } from "./events-view";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, user, role, organiser } = await requireOrganiser("/events");
  const { status } = await searchParams;
  const { data } = await supabase
    .from("events")
    .select("id, name, type, status, opens_at, closes_at, cover_path, logo_path, accent")
    .eq("tenant_id", organiser.id)
    .order("created_at", { ascending: false });

  const env = supabaseEnv();
  const img = (bucket: string, path: string | null) => (path && env ? storageUrl(bucket, path, env.url) : null);
  const events: EventListItem[] = (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    status: e.status,
    opens_at: e.opens_at,
    closes_at: e.closes_at,
    accent: e.accent ?? organiser.accent,
    coverUrl: img("event-covers", e.cover_path),
    logoUrl: img("event-logos", e.logo_path) ?? organiser.logoUrl,
  }));

  return (
    <EventsView
      organisation={organiser.name}
      person={{ email: user.email ?? "", role: roleLabel[role] }}
      canCreate={role === "owner" || role === "admin"}
      events={events}
      filter={parseFilter(status)}
    />
  );
}
