import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { BrandForm } from "./brand-form";

export const metadata: Metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const { organiser, role } = await requireOrganiser("/setup/brand");
  // Only owners and admins can change the brand; everyone else goes straight to their events.
  if (role !== "owner" && role !== "admin") redirect("/events");
  return <BrandForm organiser={organiser} />;
}
