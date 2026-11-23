import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/organiser";
import { OrganisationForm } from "./organisation-form";

export const metadata: Metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

export default async function OrganisationPage() {
  const { supabase, user } = await requireUser("/setup/organisation");
  const { count } = await supabase
    .from("tenant_members")
    .select("tenant_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  // Already belongs to an organiser: step 1 is done.
  if (count) redirect("/setup/brand");
  return <OrganisationForm />;
}
