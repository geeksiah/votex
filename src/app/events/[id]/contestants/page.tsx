import type { Metadata } from "next";
import { EventShell } from "@/components/dashboard/event-shell";
import { storageUrl } from "@/lib/event-metadata";
import { requireEvent, roleLabel } from "@/lib/organiser";
import { supabaseEnv } from "@/lib/supabase/env";
import { ContestantsView, type ContestantItem } from "./contestants-view";

export const metadata: Metadata = { title: "Contestants" };
export const dynamic = "force-dynamic";

export default async function ContestantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ category?: string }> }) {
  const { id } = await params;
  const { category } = await searchParams;
  const { supabase, user, role, organiser, event } = await requireEvent(id, `/events/${id}/contestants`);
  const canEdit = role === "owner" || role === "admin";
  const [{ data: people }, { data: cats }, { data: contacts }] = await Promise.all([
    supabase
      .from("contestants")
      .select("id, name, code, photo_path, visible, category_entries(category_id)")
      .eq("event_id", id)
      .is("deleted_at", null)
      .order("code"),
    supabase.from("categories").select("id, name").eq("event_id", id).is("deleted_at", null).order("position").order("created_at"),
    canEdit ? supabase.from("contestant_contacts").select("contestant_id, phone") : Promise.resolve({ data: [] as { contestant_id: string; phone: string | null }[] }),
  ]);

  const env = supabaseEnv();
  const phones = new Map((contacts ?? []).map((c) => [c.contestant_id, c.phone]));
  const items: ContestantItem[] = (people ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    photoUrl: p.photo_path && env ? storageUrl("contestant-photos", p.photo_path, env.url) : null,
    visible: p.visible,
    categoryIds: (p.category_entries as unknown as { category_id: string }[]).map((e) => e.category_id),
    phone: phones.get(p.id) ?? null,
    // Votes arrive with the vote ledger (build step 3).
    votes: 0,
  }));
  const categories = (cats ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <EventShell organisation={organiser.name} person={{ email: user.email, role: roleLabel[role] }} event={event} active="contestants" bare={Boolean(category)}>
      <ContestantsView
        event={{ id: event.id, tenantId: organiser.id, name: event.name }}
        contestants={items}
        categories={categories}
        initialCategory={categories.some((c) => c.id === category) ? category! : "all"}
        canEdit={canEdit}
      />
    </EventShell>
  );
}
