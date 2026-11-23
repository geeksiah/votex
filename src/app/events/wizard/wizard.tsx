"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { EventLogo } from "@/components/ui/badges";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { QuickPick } from "@/components/ui/quick-pick";
import { TextField } from "@/components/ui/text-field";
import { onAccent } from "@/lib/contrast";
import { cx } from "@/lib/cx";
import { dateRange } from "@/lib/event-display";
import {
  DEFAULT_QUICK_PICKS,
  EXAMPLE_FEE_BASIS_POINTS,
  SLUG_PATTERN,
  TYPE_LABEL,
  hasPrice,
  slugFromName,
  type WizardType,
} from "@/lib/event-setup";
import { formatMoney, parseMoney, percentOf } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { countryZone, isoToZoned, pickerDate, zonedToIso } from "@/lib/zoned-time";
import { WizardFrame } from "./wizard-frame";

// O3 · Create an event (approved 22 Nov 2026). One decision per step; "Save draft" works on every step.

export type WizardOrganiser = {
  id: string;
  name: string;
  accent: string | null;
  logoUrl: string | null;
  country: string;
  currency: string;
};

export type WizardDraft = {
  id: string;
  type: WizardType;
  name: string;
  slug: string;
  opensAt: string | null;
  closesAt: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  accent: string | null;
  showLiveResults: boolean;
  hideLastHours: number | null;
  maxVotesPerPhone: number | null;
  priceMinor: number | null;
  quickPicks: number[];
  defaultPick: number;
  step: number;
};

const SWATCHES = ["#C2410C", "#0E7C66", "#1D4ED8", "#B4232A", "#7C5A10", "#18181B"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const TYPES: { value: WizardType; title: string; line: string; examples: string }[] = [
  { value: "paid_voting", title: "Awards or pageant", line: "Paid votes for contestants in categories", examples: "Music awards, Miss Ghana, school pageants" },
  { value: "election", title: "Election", line: "One vote per member from a voter list", examples: "SRC, unions, associations" },
  { value: "nominations", title: "Nominations only", line: "Collect names before the voting starts", examples: "Public calls, staff awards" },
  { value: "tickets", title: "Tickets only", line: "Sell tickets and check guests in", examples: "Concerts, galas, conferences" },
];

type Props = {
  organiser: WizardOrganiser;
  siteHost: string;
  draft: WizardDraft | null;
  /** Local design check only: no network, nothing saved. */
  preview?: boolean;
};

export function Wizard({ organiser, siteHost, draft, preview }: Props) {
  const router = useRouter();
  const zone = countryZone(organiser.country);
  const [id, setId] = useState<string | null>(draft?.id ?? null);
  const [step, setStep] = useState(draft?.step ?? 1);
  const [furthest, setFurthest] = useState(draft?.step ?? 1);
  const [type, setType] = useState<WizardType>(draft?.type ?? "paid_voting");
  const [name, setName] = useState(draft?.name === "Untitled event" ? "" : (draft?.name ?? ""));
  const [slug, setSlug] = useState(draft && !draft.slug.startsWith("draft-") ? draft.slug : "");
  const [slugEdited, setSlugEdited] = useState(Boolean(draft && !draft.slug.startsWith("draft-")));
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");
  const [opens, setOpens] = useState(draft?.opensAt ? isoToZoned(draft.opensAt, zone.tz) : "");
  const [closes, setCloses] = useState(draft?.closesAt ? isoToZoned(draft.closesAt, zone.tz) : "");
  const [accent, setAccent] = useState((draft?.accent ?? organiser.accent ?? SWATCHES[0]!).toUpperCase());
  const [accentCode, setAccentCode] = useState(accent);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(draft?.coverUrl ?? null);
  const [liveResults, setLiveResults] = useState(draft?.showLiveResults ?? true);
  const [hideLast, setHideLast] = useState(draft ? draft.hideLastHours !== null : true);
  const [limitPhone, setLimitPhone] = useState(draft ? draft.maxVotesPerPhone !== null : false);
  const [priceText, setPriceText] = useState(
    draft?.priceMinor != null ? formatMoney({ minor: draft.priceMinor, currency: organiser.currency }) : formatMoney({ minor: 100, currency: organiser.currency }),
  );
  const [picks] = useState<number[]>(draft?.quickPicks?.length ? draft.quickPicks : DEFAULT_QUICK_PICKS);
  const [defaultPick, setDefaultPick] = useState(draft?.defaultPick ?? 10);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  const priceMinor = parseMoney(priceText, organiser.currency);
  const money = (minor: number) => formatMoney({ minor, currency: organiser.currency });
  const accentValid = HEX.test(accentCode);
  const paid = hasPrice(type);

  // The link follows the name until the organiser edits it.
  useEffect(() => {
    if (!slugEdited) setSlug(slugFromName(name));
  }, [name, slugEdited]);

  // Check the link is free (debounced). Drafts of other organisers count too, so this asks the server.
  useEffect(() => {
    if (!slug) return setSlugState("idle");
    if (!SLUG_PATTERN.test(slug) || slug.length < 3) return setSlugState("invalid");
    if (preview) return setSlugState("free");
    setSlugState("checking");
    const t = setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.rpc("event_slug_available", { p_slug: slug, p_event: id ?? undefined });
      setSlugState(data ? "free" : "taken");
    }, 350);
    return () => clearTimeout(t);
  }, [slug, id, preview]);

  function validate(s: number): boolean {
    const e: Record<string, string | undefined> = {};
    if (s === 2) {
      if (name.trim().length < 2) e.name = "Enter the event name, like Akoma Music Awards 2026";
      if (slugState === "invalid" || !slug) e.slug = "Use at least 3 letters, numbers or dashes";
      else if (slugState === "taken") e.slug = "This link is taken. Try another.";
      if (!opens) e.opens = "Choose when voting opens";
      if (!closes) e.closes = "Choose when voting closes";
      if (opens && closes && closes <= opens) e.closes = "Voting must close after it opens";
    }
    if (s === 3 && !accentValid) e.accent = "Enter a colour code like #C2410C";
    if (s === 6 && paid && (priceMinor === null || priceMinor <= 0)) e.price = `Enter a price, like ${money(100)}`;
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  /** Saves everything entered so far. Creates the draft the first time. Returns the event id. */
  async function save(nextStep: number | null): Promise<string | null> {
    if (preview) return id ?? "preview";
    const supabase = createClient();
    if (!supabase) return null;
    const row = {
      type,
      name: name.trim() || "Untitled event",
      slug: slug && slugState !== "taken" && slugState !== "invalid" ? slug : undefined,
      opens_at: opens ? zonedToIso(opens, zone.tz) : null,
      closes_at: closes ? zonedToIso(closes, zone.tz) : null,
      accent: accentValid ? accentCode.toLowerCase() : null,
      show_live_results: liveResults,
      hide_results_last_hours: hideLast ? 24 : null,
      ussd_enabled: false,
      max_votes_per_phone: limitPhone ? 100 : null,
      price_minor: paid && priceMinor !== null ? priceMinor : null,
      quick_picks: picks,
      default_pick: defaultPick,
      setup_step: nextStep,
    };
    let eventId = id;
    if (!eventId) {
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...row,
          slug: row.slug ?? `draft-${crypto.randomUUID().slice(0, 8)}`,
          tenant_id: organiser.id,
          currency: organiser.currency,
          status: "draft",
        })
        .select("id")
        .single();
      if (error || !data) return null;
      eventId = data.id as string;
      setId(eventId);
      await supabase.from("rounds").insert({ event_id: eventId, tenant_id: organiser.id, position: 1, name: "Public vote", opens_at: row.opens_at, closes_at: row.closes_at });
    } else {
      const { slug: s, ...rest } = row;
      const { error } = await supabase.from("events").update(s ? { ...rest, slug: s } : rest).eq("id", eventId);
      if (error) return null;
      await supabase.from("rounds").update({ opens_at: row.opens_at, closes_at: row.closes_at }).eq("event_id", eventId).eq("position", 1);
    }
    if (coverFile) {
      const ext = coverFile.type === "image/png" ? "png" : coverFile.type === "image/webp" ? "webp" : "jpg";
      const path = `${organiser.id}/${eventId}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, coverFile, { contentType: coverFile.type });
      if (!error) {
        await supabase.from("events").update({ cover_path: path }).eq("id", eventId);
        setCoverFile(null);
      }
    }
    return eventId;
  }

  const next = (s: number) => (s === 5 && !paid ? 7 : s + 1);
  const prev = (s: number) => (s === 7 && !paid ? 5 : s - 1);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !validate(step)) return;
    setBusy(true);
    if (step === 7) {
      const saved = await save(null);
      setBusy(false);
      if (!saved) return setErrors({ form: "We could not save this event. Try again." });
      router.push("/events");
      router.refresh();
      return;
    }
    const to = next(step);
    // From Basics on there is enough to keep a draft, so each step is saved as the organiser goes.
    if (step >= 2) {
      const saved = await save(to);
      if (!saved) {
        setBusy(false);
        return setErrors({ form: "We could not save your progress. Try again." });
      }
    }
    setBusy(false);
    setStep(to);
    setFurthest((f) => Math.max(f, to));
    window.scrollTo({ top: 0 });
  }

  async function saveDraft() {
    setSavingDraft(true);
    const saved = await save(step);
    setSavingDraft(false);
    if (!saved) return setErrors({ form: "We could not save the draft. Try again." });
    router.push("/events");
    router.refresh();
  }

  const titles: Record<number, [string, string?]> = {
    1: ["What are you running?", "You can add nominations or tickets to any event later."],
    2: ["Name your event"],
    3: ["Choose the look", "We filled this in from your organisation. Change it for this event if you like."],
    4: ["Plan your rounds", "Most events need one. Add more for heats, finals or judges."],
    5: ["Set the voting rules"],
    6: ["Set the vote price"],
    7: ["Check and save"],
  };
  const [title, subtitle] = titles[step]!;
  const fee = priceMinor ? percentOf(priceMinor, EXAMPLE_FEE_BASIS_POINTS) : 0;
  const style = accentValid ? ({ "--vx-color-accent": accentCode, "--vx-color-on-accent": onAccent(accentCode) } as React.CSSProperties) : undefined;

  return (
    <form onSubmit={onSubmit} noValidate style={style}>
      <WizardFrame
        step={step}
        done={(n) => n < furthest || (n === 6 && !paid && furthest > 5)}
        onStep={(n) => setStep(n)}
        onBack={() => setStep(prev(step))}
        onClose={() => router.push("/events")}
        onSaveDraft={saveDraft}
        savingDraft={savingDraft}
        title={title}
        subtitle={subtitle}
        primary={step === 7 ? "Save and add categories" : "Continue"}
        busy={busy}
        aside={step === 6 && paid ? <VoterPreview price={priceMinor ?? 0} picks={picks} pick={defaultPick} money={money} /> : undefined}
      >
        {step === 1 ? <TypeStep value={type} onChange={setType} /> : null}

        {step === 2 ? (
          <>
            <TextField
              label="Event name"
              autoFocus
              maxLength={120}
              placeholder="Akoma Music Awards 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <LinkField
              host={siteHost}
              value={slug}
              onChange={(v) => {
                setSlugEdited(true);
                setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60));
              }}
              state={slugState}
              error={errors.slug}
            />
            <div className="flex flex-col gap-5 md:flex-row md:gap-4">
              <DateField label="Voting opens" value={opens} onChange={setOpens} tz={zone.tz} error={errors.opens} />
              <DateField label="Voting closes" value={closes} onChange={setCloses} tz={zone.tz} error={errors.closes} />
            </div>
            <p className="-mt-2 hidden vx-caption text-muted md:block">Times are in {zone.label}.</p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="vx-body-md-medium text-fg">Cover photo</span>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="flex h-[76px] items-center gap-3.5 rounded-md border border-border-strong bg-bg px-3.5 text-left hover:bg-subtle"
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview or Storage upload
                  <img src={coverPreview} alt="" className="size-12 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <EventLogo name={name || organiser.name} size={48} src={organiser.logoUrl} />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate vx-body-md-strong text-fg">{coverFile?.name ?? (coverPreview ? "Cover photo" : "Upload a cover photo")}</span>
                  <span className="vx-caption text-muted">Wide, at least 1600 × 900</span>
                </span>
                <span className="vx-body-md-medium text-fg">{coverPreview ? "Change" : "Choose"}</span>
              </button>
              <input
                ref={coverInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-label="Cover photo file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!IMAGE_TYPES.includes(f.type)) return setErrors({ cover: "Choose a PNG, JPG or WebP image" });
                  if (f.size > 5 * 1024 * 1024) return setErrors({ cover: "Choose an image under 5 MB" });
                  setErrors({});
                  setCoverFile(f);
                  setCoverPreview(URL.createObjectURL(f));
                }}
              />
              {errors.cover ? <p className="vx-caption-medium text-danger-fg">{errors.cover}</p> : null}
            </div>
            <ColourField
              value={accent}
              code={accentCode}
              onSwatch={(hex) => {
                setAccent(hex);
                setAccentCode(hex);
              }}
              onCode={(v) => {
                setAccentCode(v);
                if (HEX.test(v)) setAccent(v);
              }}
              error={errors.accent}
            />
          </>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 rounded-md border border-border-strong bg-bg p-4">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle vx-body-md-strong text-fg">
                1
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="vx-body-md-strong text-fg">Public vote</span>
                <span className="vx-caption text-muted">
                  {[opens && closes ? dateRange(new Date(zonedToIso(opens, zone.tz)), new Date(zonedToIso(closes, zone.tz)), zone.tz) : null, paid ? "paid votes" : "votes", "100%"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="flex flex-col">
            <Toggle label="Show live results" note="Voters see counts as they come in" checked={liveResults} onChange={setLiveResults} />
            <Toggle label="Hide results in the last 24 hours" note="Keeps the finish a surprise" checked={hideLast} onChange={setHideLast} />
            <Toggle
              label="Limit votes per phone number"
              note={limitPhone ? "On: up to 100 votes per phone number" : "Off: voters can vote as often as they like"}
              checked={limitPhone}
              onChange={setLimitPhone}
            />
          </div>
        ) : null}

        {step === 6 && paid ? (
          <>
            <TextField
              label="Price per vote"
              inputMode="decimal"
              autoFocus
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              onBlur={() => priceMinor !== null && setPriceText(money(priceMinor))}
              helper={`Voters pay in ${organiser.currency}, the main currency of ${organiser.name}.`}
              error={errors.price}
            />
            <div className="flex flex-col gap-2.5">
              <span className="vx-body-md-medium text-fg">Quick picks voters see</span>
              <QuickPick
                label="Quick picks voters see"
                options={picks.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(defaultPick)}
                onChange={(v) => setDefaultPick(Number(v))}
                className="flex-nowrap [&>button]:min-w-0"
              />
              <p className="vx-caption text-muted">Voters can also type any number.</p>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-subtle p-4">
              <Row label="Voter pays" value={money(priceMinor ?? 0)} />
              <Row label="Payment and service fees" value={`− ${money(fee)}`} />
              <Row label="You get per vote" value={money((priceMinor ?? 0) - fee)} strong />
            </div>
            <p className="vx-caption text-muted">
              Every category costs {money(priceMinor ?? 0)} a vote. You can set a different price for any category later.
            </p>
          </>
        ) : null}

        {step === 7 ? (
          <>
            <div className="flex flex-col rounded-md border border-border-strong bg-bg px-4 py-1">
              <Row label="Type" value={TYPE_LABEL[type]} divided />
              <Row label="Name" value={name.trim()} divided />
              <Row label="Link" value={`${siteHost}/${slug}`} divided />
              <Row
                label="Voting"
                value={opens && closes ? dateRange(new Date(zonedToIso(opens, zone.tz)), new Date(zonedToIso(closes, zone.tz)), zone.tz) : "Not set"}
                divided
              />
              <Row label="Rounds" value="1 · public vote" divided />
              {paid ? <Row label="Price" value={`${money(priceMinor ?? 0)} per vote`} divided /> : null}
            </div>
            <div className="flex gap-3 rounded-md bg-info-bg p-4">
              <Icon name="alert" size={20} className="shrink-0 text-info-fg" />
              <div className="flex flex-col gap-0.5">
                <p className="vx-body-md-strong text-fg">Add categories next</p>
                <p className="vx-caption text-muted">You can publish once you have at least one category with a contestant.</p>
              </div>
            </div>
          </>
        ) : null}

        {errors.form ? (
          <p role="alert" className="vx-body-md-medium text-danger-fg">
            {errors.form}
          </p>
        ) : null}
      </WizardFrame>
    </form>
  );
}

function TypeStep({ value, onChange }: { value: WizardType; onChange: (v: WizardType) => void }) {
  return (
    <div role="radiogroup" aria-label="Event type" className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
      {TYPES.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.value)}
            className={cx(
              "flex h-[76px] items-center gap-3.5 rounded-md bg-bg px-4 text-left lg:h-auto lg:flex-col lg:items-start lg:gap-1.5 lg:p-5",
              on ? "border-2 border-fg" : "border border-border-strong hover:bg-subtle",
            )}
          >
            <span
              aria-hidden
              className={cx("grid size-[22px] shrink-0 place-items-center rounded-full lg:hidden", on ? "bg-primary" : "border-[1.5px] border-border-strong")}
            >
              {on ? <span className="size-2 rounded-full bg-on-primary" /> : null}
            </span>
            <span className="flex flex-col gap-0.5 lg:gap-1.5">
              <span className="vx-body-lg-medium text-fg lg:vx-body-lg-strong">{t.title}</span>
              <span className="vx-caption text-muted lg:vx-body-md">
                {t.line}
                <span className="hidden lg:inline">.</span>
              </span>
              <span className="mt-3 hidden vx-caption text-faint lg:block">{t.examples}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LinkField({
  host,
  value,
  onChange,
  state,
  error,
}: {
  host: string;
  value: string;
  onChange: (v: string) => void;
  state: "idle" | "checking" | "free" | "taken" | "invalid";
  error?: string;
}) {
  const note =
    error ??
    (state === "free" ? "This link is free ✓" : state === "taken" ? "This link is taken. Try another." : state === "checking" ? "Checking…" : undefined);
  const bad = Boolean(error) || state === "taken";
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="event-link" className="vx-body-md-medium text-fg">
        Event link
      </label>
      <div
        className={cx(
          "flex h-14 items-center rounded-md border bg-bg px-4 text-[20px] leading-[1.45]",
          bad
            ? "border-danger-fg shadow-[inset_0_0_0_1px_var(--vx-color-danger-fg)]"
            : "border-border-strong focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]",
        )}
      >
        <span className="shrink-0 text-fg">{host}/</span>
        <input
          id="event-link"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={bad || undefined}
          aria-describedby="event-link-note"
          className="min-w-0 flex-1 bg-transparent text-fg outline-none"
        />
      </div>
      {note ? (
        <p id="event-link-note" className={cx("vx-caption", bad ? "vx-caption-medium text-danger-fg" : "text-muted")}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function DateField({ label, value, onChange, tz, error }: { label: string; value: string; onChange: (v: string) => void; tz: string; error?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div
        className={cx(
          "relative flex h-14 items-center gap-2 rounded-md border bg-bg px-4",
          error ? "border-danger-fg shadow-[inset_0_0_0_1px_var(--vx-color-danger-fg)]" : "border-border-strong focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--vx-color-focus)]",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="vx-caption text-muted">{label}</span>
          <span className={cx("truncate vx-body-md-strong", value ? "text-fg" : "text-faint")}>
            {value ? (
              <>
                <span className="md:hidden lg:inline">{pickerDate(zonedToIso(value, tz), tz)}</span>
                <span className="hidden md:inline lg:hidden">{pickerDate(zonedToIso(value, tz), tz, false)}</span>
              </>
            ) : (
              "Choose a date and time"
            )}
          </span>
        </span>
        <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-muted">
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <input
          type="datetime-local"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {error ? <p className="vx-caption-medium text-danger-fg">{error}</p> : null}
    </div>
  );
}

function ColourField({
  value,
  code,
  onSwatch,
  onCode,
  error,
}: {
  value: string;
  code: string;
  onSwatch: (hex: string) => void;
  onCode: (v: string) => void;
  error?: string;
}) {
  const valid = HEX.test(code);
  const helper = valid
    ? onAccent(code) === "#ffffff"
      ? "Passes the contrast check. White text on this colour is readable."
      : "Passes the contrast check. Black text on this colour is readable."
    : undefined;
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 vx-body-md-medium text-fg">Event colour</legend>
      <div className="flex gap-2.5">
        {SWATCHES.map((hex) => (
          <label key={hex} className="cursor-pointer">
            <input type="radio" name="swatch" value={hex} checked={value === hex && code === hex} onChange={() => onSwatch(hex)} className="peer sr-only" />
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
        onChange={(e) => {
          const v = e.target.value.trim();
          onCode((v.startsWith("#") ? v : `#${v}`).toUpperCase());
        }}
        helper={helper}
        error={error}
      />
    </fieldset>
  );
}

function Toggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 border-b border-border py-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="vx-body-md-strong text-fg">{label}</span>
        <span className="vx-caption text-muted">{note}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cx(
          "flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
          checked ? "justify-end bg-primary" : "justify-start bg-border-strong",
        )}
      >
        <span className="size-5 rounded-full bg-white" />
      </span>
    </label>
  );
}

function Row({ label, value, strong, divided }: { label: string; value: ReactNode; strong?: boolean; divided?: boolean }) {
  return (
    <div className={cx("flex items-center gap-4", divided ? "border-b border-border py-3 last:border-b-0" : "py-2")}>
      <span className={cx("flex-1", strong ? "vx-body-md-strong text-fg" : "vx-body-md text-muted")}>{label}</span>
      <span className={cx("text-right", strong ? "vx-body-md-strong text-fg" : "vx-body-md-medium text-fg")}>{value}</span>
    </div>
  );
}

// Desktop 1280 · step 6 "What voters see".
function VoterPreview({ price, picks, pick, money }: { price: number; picks: number[]; pick: number; money: (m: number) => string }) {
  return (
    <div className="flex w-[348px] flex-col gap-4 rounded-lg bg-subtle p-6">
      <p className="vx-caption-medium text-muted">What voters see</p>
      <div className="flex flex-col gap-3.5 rounded-[20px] bg-bg p-5 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        <p className="text-[20px] leading-[1.3] font-semibold text-fg">Vote for Efua Mensah</p>
        <p className="vx-caption text-muted">Best Female Vocalist · {money(price)} a vote</p>
        <div className="flex gap-1.5" aria-hidden>
          {picks.map((n) => (
            <span
              key={n}
              className={cx(
                "grid h-[52px] flex-1 place-items-center rounded-md vx-body-md-medium",
                n === pick ? "bg-primary text-on-primary" : "border border-border-strong text-fg",
              )}
            >
              {n}
            </span>
          ))}
        </div>
        <span aria-hidden className={cx(buttonClass({ size: "md", block: true }), "pointer-events-none")}>
          Pay {money(price * pick)}
        </span>
      </div>
    </div>
  );
}
