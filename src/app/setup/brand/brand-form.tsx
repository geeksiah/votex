"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { EventLogo } from "@/components/ui/badges";
import { Button, buttonClass } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { onAccent } from "@/lib/contrast";
import { cx } from "@/lib/cx";
import type { Organiser } from "@/lib/organiser";
import { createClient } from "@/lib/supabase/client";
import { BackButton, SetupShell } from "../setup-shell";

// O1 onboarding 2 · "Add your logo and colour" (approved 22 Nov 2026).
const SWATCHES = ["#C2410C", "#0E7C66", "#1D4ED8", "#B4232A", "#7C5A10", "#18181B"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function BrandForm({ organiser }: { organiser: Organiser }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [accent, setAccent] = useState((organiser.accent ?? SWATCHES[0]!).toUpperCase());
  const [code, setCode] = useState(accent);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(organiser.logoUrl);
  const [logoError, setLogoError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const valid = HEX.test(code);
  const textOn = valid ? onAccent(code) : "#ffffff";
  const helper = valid
    ? textOn === "#ffffff"
      ? "Passes the contrast check. White text on this colour is readable."
      : "Passes the contrast check. Black text on this colour is readable."
    : undefined;

  function pickSwatch(hex: string) {
    setAccent(hex);
    setCode(hex);
    setCodeError(undefined);
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!TYPES.includes(f.type)) return setLogoError("Choose a PNG, JPG or WebP image");
    if (f.size > MAX_BYTES) return setLogoError("Choose an image under 2 MB");
    setLogoError(undefined);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      setCodeError("Enter a colour code like #C2410C");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    let logoPath = organiser.logoPath;
    if (file) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${organiser.id}/logo-${Date.now()}.${ext}`;
      const { error: up } = await supabase.storage.from("tenant-logos").upload(path, file, { contentType: file.type });
      if (up) {
        setBusy(false);
        setLogoError("We could not upload this logo. Try again.");
        return;
      }
      logoPath = path;
    }
    const { error: save } = await supabase
      .from("tenants")
      .update({ accent: code.toLowerCase(), logo_path: logoPath })
      .eq("id", organiser.id);
    if (save) {
      setBusy(false);
      setCodeError("We could not save this. Try again.");
      return;
    }
    router.push("/events");
    router.refresh();
  }

  const skip = (
    <Link href="/events" className="vx-body-md-medium text-fg underline-offset-4 hover:underline">
      Skip for now
    </Link>
  );

  return (
    <form onSubmit={onSubmit} noValidate style={valid ? ({ "--vx-color-accent": code, "--vx-color-on-accent": textOn } as React.CSSProperties) : undefined}>
      <SetupShell
        step={2}
        title="Add your logo and colour"
        subtitle="You can use different ones for each event."
        back={<BackButton label="Back" onClick={() => router.back()} />}
        headerAction={
          <Link href="/events" className="vx-body-md-medium text-fg underline-offset-4 hover:underline md:hidden">
            Skip
          </Link>
        }
        actions={
          <>
            <Button type="submit" busy={busy} block className="lg:w-auto">
              Continue
            </Button>
            <span className="mt-5 hidden md:block lg:mt-0">{skip}</span>
          </>
        }
        aside={<Preview name={organiser.name} logo={preview} />}
      >
        <div className="flex flex-col gap-2">
          <span className="vx-body-md-medium text-fg">Logo</span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-[76px] items-center gap-3.5 rounded-md border border-border-strong bg-bg px-3.5 text-left hover:bg-subtle"
          >
            <EventLogo name={organiser.name} size={48} src={preview} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate vx-body-md-strong text-fg">{file?.name ?? (preview ? "Your logo" : "Upload a logo")}</span>
              <span className="vx-caption text-muted">Square, at least 400 × 400</span>
            </span>
            <span className="vx-body-md-medium text-fg">{preview ? "Change" : "Choose"}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Logo file"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {logoError ? <p className="vx-caption-medium text-danger-fg">{logoError}</p> : null}
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 vx-body-md-medium text-fg">Event colour</legend>
          <div className="flex gap-2.5">
            {SWATCHES.map((hex) => (
              <label key={hex} className="cursor-pointer">
                <input
                  type="radio"
                  name="swatch"
                  value={hex}
                  checked={accent === hex && code.toUpperCase() === hex}
                  onChange={() => pickSwatch(hex)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  style={{ backgroundColor: hex }}
                  className="block size-9 rounded-full peer-checked:shadow-[inset_0_0_0_3px_var(--vx-color-fg)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
                />
                <span className="sr-only">{hex}</span>
              </label>
            ))}
          </div>
          <TextField
            label="Or enter a colour code"
            value={code}
            maxLength={7}
            spellCheck={false}
            autoCapitalize="characters"
            onChange={(e) => {
              const v = e.target.value.trim();
              const next = (v.startsWith("#") ? v : `#${v}`).toUpperCase();
              setCode(next);
              setCodeError(undefined);
              if (HEX.test(next)) setAccent(next);
            }}
            helper={helper}
            error={codeError}
          />
        </fieldset>
      </SetupShell>
    </form>
  );
}

// Desktop live preview: how the colour and logo look on a voter's phone.
function Preview({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-subtle p-6">
      <p className="vx-caption-medium text-muted">Preview</p>
      <div className="flex w-[300px] flex-col gap-4 rounded-[20px] bg-bg p-5 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2.5">
          <EventLogo name={name} size={32} src={logo} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate vx-body-md-strong text-fg">{name}</span>
            <span className="vx-caption text-muted">Your event</span>
          </div>
        </div>
        <p className="vx-heading-lg text-fg">Best Afrobeats Song</p>
        <span aria-hidden className={cx(buttonClass({ size: "md", block: true }), "pointer-events-none")}>
          Vote by code
        </span>
        <p className="vx-caption text-muted">Your colour marks the logo. Buttons stay dark so they are always easy to read.</p>
      </div>
    </div>
  );
}
