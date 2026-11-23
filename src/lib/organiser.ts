import "server-only";
import { redirect } from "next/navigation";
import { storageUrl } from "@/lib/event-metadata";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export type MemberRole = "owner" | "admin" | "finance" | "viewer" | "judge_coordinator";

export type Organiser = {
  id: string;
  name: string;
  accent: string | null;
  logoUrl: string | null;
  logoPath: string | null;
  country: string;
  currency: string;
};

/** The signed-in person, or a redirect to sign-in. */
export async function requireUser(next: string) {
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in");
  // getClaims checks the signed token locally (no trip to the auth server); the middleware has already
  // refreshed it. Database rules still check every query on the server.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return { supabase, user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" } };
}

/**
 * The organiser the signed-in person works for, or a redirect: to sign-in when signed out, to set-up when
 * they do not belong to an organiser yet. Several organisers per person comes later; the oldest is used.
 */
export async function requireOrganiser(next: string) {
  const { supabase, user } = await requireUser(next);
  const { data: member } = await supabase
    .from("tenant_members")
    .select("role, tenants(id, name, accent, logo_path, country, default_currency)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const t = member?.tenants as unknown as {
    id: string;
    name: string;
    accent: string | null;
    logo_path: string | null;
    country: string;
    default_currency: string;
  } | null;
  if (!member || !t) redirect("/setup/organisation");

  const env = supabaseEnv();
  const organiser: Organiser = {
    id: t.id,
    name: t.name,
    accent: t.accent,
    logoPath: t.logo_path,
    logoUrl: t.logo_path && env ? storageUrl("tenant-logos", t.logo_path, env.url) : null,
    country: t.country,
    currency: t.default_currency,
  };
  return { supabase, user, role: member.role as MemberRole, organiser };
}

export const roleLabel: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  finance: "Finance",
  viewer: "Viewer",
  judge_coordinator: "Judge coordinator",
};
