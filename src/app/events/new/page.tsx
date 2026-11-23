import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { Wizard } from "../wizard/wizard";
import { siteHost } from "../wizard/site-host";

export const metadata: Metadata = { title: "New event" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const { organiser, role } = await requireOrganiser("/events/new");
  if (role !== "owner" && role !== "admin") redirect("/events");
  return <Wizard organiser={organiser} siteHost={siteHost()} draft={null} />;
}
