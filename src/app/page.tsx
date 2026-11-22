import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// Staging check for R1 step 1: proves email-code sign-in works end to end.
// Replaced by O2 Events home in step 2 (not a designed screen; never shipped to organisers).
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!data.user) redirect("/sign-in");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-6">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="vx-heading-xl">You are signed in</h1>
        <p className="vx-body-lg text-muted">{data.user.email}</p>
      </div>
      <form action="/sign-out" method="post">
        <Button type="submit" variant="secondary" block>
          Sign out
        </Button>
      </form>
    </main>
  );
}
