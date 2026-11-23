"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Picker } from "@/components/ui/picker";
import { TextField } from "@/components/ui/text-field";
import { COUNTRIES, CURRENCIES, countryCurrency } from "@/lib/regions";
import { createClient } from "@/lib/supabase/client";
import { BackButton, SetupShell } from "../setup-shell";

// O1 onboarding 1 · "Name your organisation" (approved 22 Nov 2026).
export function OrganisationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("GH");
  const [currency, setCurrency] = useState("GHS");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Enter your organisation name, like Akoma Events Ltd");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    const { error: e2 } = await supabase.rpc("create_tenant", { p_name: trimmed, p_country: country, p_currency: currency });
    if (e2) {
      setBusy(false);
      setError("We could not save this. Try again.");
      return;
    }
    router.push("/setup/brand");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <SetupShell
        step={1}
        title="Name your organisation"
        subtitle="This name shows on your events and receipts."
        back={
          <BackButton
            label="Back to sign in"
            onClick={async () => {
              await fetch("/sign-out", { method: "POST" });
              router.replace("/sign-in");
            }}
          />
        }
        actions={
          <Button type="submit" busy={busy} block className="lg:w-auto">
            Continue
          </Button>
        }
      >
        <TextField
          label="Organisation name"
          name="organisation"
          autoComplete="organization"
          autoFocus
          maxLength={120}
          placeholder="Akoma Events Ltd"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <Picker
          label="Country"
          value={country}
          options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
          onChange={(c) => {
            setCountry(c);
            setCurrency(countryCurrency(c));
          }}
        />
        <Picker
          label="Main currency"
          value={currency}
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
          onChange={setCurrency}
        />
      </SetupShell>
    </form>
  );
}
