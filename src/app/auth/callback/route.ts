import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/app/sign-in/auth-helpers";
import { createClient } from "@/lib/supabase/server";

// Sign-in by email link (works alongside the 6-digit code). Supabase sends people here with a one-time
// ?code=…, which is exchanged for a session in the same browser that asked for it.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const back = new URL("/sign-in", url.origin);
  back.searchParams.set("error", "link");
  return NextResponse.redirect(back);
}
