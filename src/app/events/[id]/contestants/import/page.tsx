import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EventShell } from "@/components/dashboard/event-shell";
import { requireEvent, roleLabel } from "@/lib/organiser";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Import contestants" };
export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, role, organiser, event } = await requireEvent(id, `/events/${id}/contestants/import`);
  if (role !== "owner" && role !== "admin") redirect(`/events/${id}/contestants`);
  const { data: cats } = await supabase.from("categories").select("id, name").eq("event_id", id).is("deleted_at", null);
  return (
    <EventShell organisation={organiser.name} person={{ email: user.email, role: roleLabel[role] }} event={event} active="contestants" bare="touch">
      <ImportFlow event={{ id: event.id, tenantId: organiser.id }} categories={cats ?? []} />
    </EventShell>
  );
}
