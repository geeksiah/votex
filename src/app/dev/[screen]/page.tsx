import { notFound } from "next/navigation";
import { EventsView, type EventListItem } from "@/app/events/events-view";
import { Wizard, type WizardDraft, type WizardOrganiser } from "@/app/events/wizard/wizard";
import { BrandForm } from "@/app/setup/brand/brand-form";
import { OrganisationForm } from "@/app/setup/organisation/organisation-form";

// Local design check: signed-in screens with the sample content used in Figma, so each screen can be
// compared side by side with its approved frame at 390, 768, 1024 and 1280. Never served in production.
export const dynamic = "force-dynamic";

const organiser: WizardOrganiser & { logoPath: null } = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Akoma Events Ltd",
  accent: "#c2410c",
  logoUrl: null,
  logoPath: null,
  country: "GH",
  currency: "GHS",
};

const events: EventListItem[] = [
  { id: "1", name: "Akoma Music Awards 2026", type: "paid_voting", status: "live", opens_at: "2026-11-06T08:00:00Z", closes_at: "2026-11-30T20:00:00Z", accent: "#c2410c", coverUrl: "/dev-samples/cover-1.png", logoUrl: null },
  { id: "2", name: "Miss Golden Coast 2026", type: "paid_voting", status: "live", opens_at: "2026-11-10T08:00:00Z", closes_at: "2026-12-06T20:00:00Z", accent: "#c2410c", coverUrl: "/dev-samples/cover-2.png", logoUrl: null },
  { id: "3", name: "Ridgeview College SRC Elections 2026", type: "election", status: "scheduled", opens_at: "2026-11-28T08:00:00Z", closes_at: "2026-11-28T18:00:00Z", accent: "#c2410c", coverUrl: null, logoUrl: null },
  { id: "4", name: "Ghana SME Excellence Awards 2026", type: "paid_voting", status: "draft", opens_at: null, closes_at: null, accent: "#c2410c", coverUrl: null, logoUrl: null },
  { id: "5", name: "Kente Queen 2025", type: "paid_voting", status: "closed", opens_at: "2025-11-20T08:00:00Z", closes_at: "2025-12-14T20:00:00Z", accent: "#c2410c", coverUrl: "/dev-samples/cover-3.png", logoUrl: null },
];

const draft = (step: number): WizardDraft => ({
  id: "preview",
  type: "paid_voting",
  name: step === 1 ? "Untitled event" : "Akoma Music Awards 2026",
  slug: "akoma26",
  opensAt: "2026-12-01T09:00:00Z",
  closesAt: "2026-12-20T21:00:00Z",
  coverPath: null,
  coverUrl: null,
  accent: "#c2410c",
  showLiveResults: true,
  hideLastHours: 24,
  maxVotesPerPhone: null,
  priceMinor: 100,
  quickPicks: [1, 10, 50, 100],
  defaultPick: 10,
  step,
});

export default async function DevScreen({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { screen } = await params;
  const person = { email: "kofi@akomaevents.com", role: "Owner" };

  if (screen === "organisation") return <OrganisationForm />;
  if (screen === "brand") return <BrandForm organiser={organiser} />;
  if (screen === "events") return <EventsView organisation={organiser.name} person={person} canCreate events={events} filter="all" />;
  if (screen === "events-empty") return <EventsView organisation={organiser.name} person={person} canCreate events={[]} filter="all" />;
  const m = /^wizard-([1-7])$/.exec(screen);
  if (m) return <Wizard organiser={organiser} siteHost="votex.eventpeepo.com" draft={draft(Number(m[1]))} preview />;
  notFound();
}
