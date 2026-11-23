import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { storageUrl } from "@/lib/event-metadata";
import type { WizardType } from "@/lib/event-setup";
import { requireOrganiser } from "@/lib/organiser";
import { supabaseEnv } from "@/lib/supabase/env";
import { siteHost } from "../../wizard/site-host";
import { Wizard, type WizardDraft } from "../../wizard/wizard";

// Reopens a draft in the create-event wizard at the step where it was saved.
export const metadata: Metadata = { title: "New event" };
export const dynamic = "force-dynamic";

export default async function DraftSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organiser, role } = await requireOrganiser(`/events/${id}/setup`);
  if (role !== "owner" && role !== "admin") redirect("/events");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ data: e }, { data: rounds }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, type, status, name, slug, opens_at, closes_at, venue, cover_path, accent, show_live_results, hide_results_last_hours, max_votes_per_phone, voter_sign_in, allow_blank_choice, nominators, nomination_fee_minor, allow_self_nomination, price_minor, quick_picks, default_pick, setup_step",
      )
      .eq("id", id)
      .eq("tenant_id", organiser.id)
      .maybeSingle(),
    supabase
      .from("rounds")
      .select("name, mode, opens_at, closes_at, weight_pct, advance_mode, advance_count, price_minor")
      .eq("event_id", id)
      .order("position"),
  ]);
  if (!e) notFound();
  if (e.status !== "draft") redirect("/events");

  const env = supabaseEnv();
  const type = (e.type === "free_poll" ? "paid_voting" : e.type) as WizardType;
  const draft: WizardDraft = {
    id: e.id,
    type,
    name: e.name,
    slug: e.slug,
    opensAt: e.opens_at,
    closesAt: e.closes_at,
    venue: e.venue,
    coverPath: e.cover_path,
    coverUrl: e.cover_path && env ? storageUrl("event-covers", e.cover_path, env.url) : null,
    accent: e.accent,
    showLiveResults: e.show_live_results,
    hideLastHours: e.hide_results_last_hours,
    maxVotesPerPhone: e.max_votes_per_phone,
    voterSignIn: e.voter_sign_in,
    allowBlankChoice: e.allow_blank_choice,
    nominators: e.nominators,
    nominationFeeMinor: e.nomination_fee_minor,
    allowSelfNomination: e.allow_self_nomination,
    priceMinor: e.price_minor,
    quickPicks: e.quick_picks ?? [],
    defaultPick: e.default_pick,
    rounds:
      type === "paid_voting"
        ? (rounds ?? []).map((r) => ({
            name: r.name,
            mode: r.mode,
            opensAt: r.opens_at,
            closesAt: r.closes_at,
            share: r.weight_pct,
            advanceMode: r.advance_mode,
            advanceCount: r.advance_count,
            priceMinor: r.price_minor,
          }))
        : [],
    // Finished wizards are not drafts; an unfinished one reopens where it stopped.
    step: e.setup_step ?? 1,
  };
  return <Wizard organiser={organiser} siteHost={siteHost()} draft={draft} />;
}
