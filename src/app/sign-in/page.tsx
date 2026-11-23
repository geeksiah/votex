import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./auth-helpers";
import { SignInFlow } from "./sign-in-flow";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const claims = supabase ? (await supabase.auth.getClaims()).data?.claims : null;
  if (claims?.sub) redirect(safeNext(next));
  return <SignInFlow next={next} linkFailed={error === "link"} />;
}
