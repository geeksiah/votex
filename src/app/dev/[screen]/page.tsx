import { notFound } from "next/navigation";
import { EventsView, type EventListItem } from "@/app/events/events-view";
import { Wizard, type WizardDraft, type WizardOrganiser } from "@/app/events/wizard/wizard";
import { BrandForm } from "@/app/setup/brand/brand-form";
import { OrganisationForm } from "@/app/setup/organisation/organisation-form";
import { CategoriesView, type CategoryItem } from "@/app/events/[id]/categories/categories-view";
import { EventShell } from "@/components/dashboard/event-shell";

const CATS: [string, string, number, number, number | null][] = [
  ["Artiste of the Year", "Main awards", 8, 18240, 200],
  ["Song of the Year", "Main awards", 10, 14870, 200],
  ["Album of the Year", "Main awards", 6, 3210, null],
  ["Best Afrobeats Song", "Genres", 5, 12480, null],
  ["Best Highlife Song", "Genres", 6, 4312, null],
  ["Best Gospel Song", "Genres", 7, 6045, null],
  ["Best Female Vocalist", "Voices", 8, 5600, null],
  ["Best Male Vocalist", "Voices", 8, 4870, null],
  ["Best New Artiste", "Voices", 10, 7220, 50],
  ["Best Music Video", "Craft", 6, 0, null],
];
const categories: CategoryItem[] = CATS.map(([name, group, contestants, votes, priceMinor], i) => ({
  id: `c${i}`,
  name,
  group,
  position: i + 1,
  priceMinor,
  visible: true,
  contestants,
  votes,
}));

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

type Sample = "awards" | "awards3" | "election" | "nominations" | "tickets";

const SAMPLES: Record<Sample, Partial<WizardDraft>> = {
  awards: { type: "paid_voting", name: "Akoma Music Awards 2026", slug: "akoma26", opensAt: "2026-12-01T09:00:00Z", closesAt: "2026-12-20T21:00:00Z" },
  awards3: {
    type: "paid_voting",
    name: "Akoma Music Awards 2026",
    slug: "akoma26",
    opensAt: "2026-12-01T09:00:00Z",
    closesAt: "2026-12-23T21:00:00Z",
    rounds: [
      { name: "Nominee vote", mode: "public", opensAt: "2026-12-01T09:00:00Z", closesAt: "2026-12-10T21:00:00Z", share: 30, advanceMode: "all", advanceCount: null, priceMinor: null },
      { name: "Top 5 vote", mode: "public", opensAt: "2026-12-12T09:00:00Z", closesAt: "2026-12-20T21:00:00Z", share: 40, advanceMode: "top", advanceCount: 5, priceMinor: 200 },
      { name: "Judges", mode: "judges", opensAt: "2026-12-21T09:00:00Z", closesAt: "2026-12-23T21:00:00Z", share: 30, advanceMode: "top", advanceCount: 5, priceMinor: null },
    ],
  },
  election: { type: "election", name: "Ridgeview College SRC Elections 2026", slug: "ridgeview-src", opensAt: "2026-11-28T08:00:00Z", closesAt: "2026-11-29T18:00:00Z" },
  nominations: { type: "nominations", name: "UG Campus Awards 2027", slug: "ugca27", opensAt: "2027-01-04T08:00:00Z", closesAt: "2027-01-31T23:59:00Z", nominationFeeMinor: 500 },
  tickets: { type: "tickets", name: "Asanteman Highlife Night 2026", slug: "highlife26", opensAt: "2026-12-19T19:00:00Z", closesAt: null, venue: "National Theatre, Accra" },
};

const draft = (sample: Sample, step: number): WizardDraft => ({
  id: "preview",
  type: "paid_voting",
  name: "",
  slug: "",
  opensAt: null,
  closesAt: null,
  venue: null,
  coverPath: null,
  coverUrl: null,
  accent: "#c2410c",
  showLiveResults: true,
  hideLastHours: 24,
  maxVotesPerPhone: null,
  voterSignIn: "member_id_email",
  allowBlankChoice: false,
  nominators: "anyone_code",
  nominationFeeMinor: null,
  allowSelfNomination: true,
  priceMinor: 100,
  quickPicks: [1, 10, 50, 100],
  defaultPick: 10,
  rounds: [],
  ...SAMPLES[sample],
  ...(step === 1 ? { name: "Untitled event", slug: "draft-preview" } : {}),
  step,
});
export default async function DevScreen({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { screen } = await params;
  const person = { email: "kofi@akomaevents.com", role: "Owner" };

  if (screen === "organisation") return <OrganisationForm />;
  if (screen === "brand") return <BrandForm organiser={organiser} />;
  if (screen === "events") return <EventsView organisation={organiser.name} person={person} canCreate events={events} filter="all" />;
  if (screen === "categories")
    return (
      <EventShell
        organisation={organiser.name}
        person={person}
        event={{ id: "e1", name: "Akoma Music Awards 2026", status: "live", accent: "#c2410c", logoUrl: null }}
        active="categories"
      >
        <CategoriesView event={{ id: "e1", tenantId: organiser.id, status: "draft", type: "paid_voting", currency: "GHS", priceMinor: 100 }} categories={categories} contestants={168} canEdit />
      </EventShell>
    );
  if (screen === "events-empty") return <EventsView organisation={organiser.name} person={person} canCreate events={[]} filter="all" />;
  // wizard-3 (awards), wizard-election-4, wizard-awards3-4 (three rounds), …
  const m = /^wizard-(?:(awards|awards3|election|nominations|tickets)-)?([1-7])$/.exec(screen);
  if (m) return <Wizard organiser={organiser} siteHost="votex.eventpeepo.com" draft={draft((m[1] as Sample) ?? "awards", Number(m[2]))} preview />;
  notFound();
}
