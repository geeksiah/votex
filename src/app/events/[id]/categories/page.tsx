import type { Metadata } from "next";
import { EventShell } from "@/components/dashboard/event-shell";
import { requireEvent, roleLabel } from "@/lib/organiser";
import { CategoriesView, type CategoryItem } from "./categories-view";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, role, organiser, event } = await requireEvent(id, `/events/${id}/categories`);
  const [{ data: cats }, { count: contestants }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, group_name, position, price_minor, visible, category_entries(count)")
      .eq("event_id", id)
      .is("deleted_at", null)
      .order("position")
      .order("created_at"),
    supabase.from("contestants").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);

  const items: CategoryItem[] = (cats ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group_name,
    position: c.position,
    priceMinor: c.price_minor,
    visible: c.visible,
    contestants: (c.category_entries as unknown as { count: number }[])[0]?.count ?? 0,
    // Votes arrive with the vote ledger (build step 3).
    votes: 0,
  }));

  return (
    <EventShell organisation={organiser.name} person={{ email: user.email, role: roleLabel[role] }} event={event} active="categories">
      <CategoriesView
        event={{ id: event.id, tenantId: organiser.id, status: event.status, type: event.type, currency: event.currency, priceMinor: event.priceMinor }}
        categories={items}
        contestants={contestants ?? 0}
        canEdit={role === "owner" || role === "admin"}
      />
    </EventShell>
  );
}
