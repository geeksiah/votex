"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  NOMINATORS,
  SLUG_PATTERN,
  STEPS,
  STEP_LABEL,
  TYPE_LABEL,
  VOTER_SIGN_IN,
  hasPrice,
  roundProblems,
  slugFromName,
  type RoundDraft,
  type StepKey,
  type WizardType,
} from "@/lib/event-setup";
import { formatMoney, parseMoney, percentOf } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { countryZone, isoToZoned, pickerDate, zonedToIso } from "@/lib/zoned-time";
import { RoundsStep, WinnerSplit } from "./rounds";
import { WizardFrame, type DraftState } from "./wizard-frame";
import { DateField, Row, SelectField, Toggle } from "./wizard-fields";

// O3 · Create an event (approved 22 Nov 2026) with the steps for each type and rounds (approved 23 Nov 2026).
// One decision per step; "Save draft" works on every step and keeps the organiser on the page.

export type WizardOrganiser = {
  id: string;
  name: string;
  accent: string | null;
  logoUrl: string | null;
  country: string;
  currency: string;
};

export type WizardRound = {
  name: string;
  mode: "public" | "judges";
  opensAt: string | null;
  closesAt: string | null;
  share: number;
  advanceMode: "all" | "top" | "pick";
  advanceCount: number | null;
  priceMinor: number | null;
};

export type WizardDraft = {
  id: string;
  type: WizardType;
  name: string;
  slug: string;
  opensAt: string | null;
  closesAt: string | null;
  venue: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  accent: string | null;
  showLiveResults: boolean;
  hideLastHours: number | null;
  maxVotesPerPhone: number | null;
  voterSignIn: string;
  allowBlankChoice: boolean;
  nominators: string;
  nominationFeeMinor: number | null;
  allowSelfNomination: boolean;
  priceMinor: number | null;
  quickPicks: number[];
  defaultPick: number;
  rounds: WizardRound[];
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

const NEXT_JOB: Record<WizardType, [string, string]> = {
  paid_voting: ["Add categories next", "You can publish once you have at least one category with a contestant."],
  election: ["Add positions next", "Then add candidates and the voter list. You can publish once each position has a candidate."],
  nominations: ["Add categories next", "Then check the form. You can open nominations once you have one category."],
  tickets: ["Add ticket types next", "You can publish once you have one ticket type."],
};

const PRIMARY: Record<WizardType, string> = {
  paid_voting: "Save and add categories",
  election: "Save and add positions",
  nominations: "Save and add categories",
  tickets: "Save and add tickets",
};

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
  const money = (minor: number) => formatMoney({ minor, currency: organiser.currency });
  const local = (iso: string | null) => (iso ? isoToZoned(iso, zone.tz) : "");

  const [id, setId] = useState<string | null>(draft?.id ?? null);
  const [type, setType] = useState<WizardType>(draft?.type ?? "paid_voting");
  const steps = STEPS[type];
  const [index, setIndex] = useState(Math.min(Math.max((draft?.step ?? 1) - 1, 0), steps.length - 1));
  const [furthest, setFurthest] = useState(index);
  const step: StepKey = steps[Math.min(index, steps.length - 1)]!;

  const [name, setName] = useState(draft?.name === "Untitled event" ? "" : (draft?.name ?? ""));
  const [slug, setSlug] = useState(draft && !draft.slug.startsWith("draft-") ? draft.slug : "");
  const [slugEdited, setSlugEdited] = useState(Boolean(draft && !draft.slug.startsWith("draft-")));
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");
  const [opens, setOpens] = useState(local(draft?.opensAt ?? null));
  const [closes, setCloses] = useState(local(draft?.closesAt ?? null));
  const [venue, setVenue] = useState(draft?.venue ?? "");
  const [accent, setAccent] = useState((draft?.accent ?? organiser.accent ?? SWATCHES[0]!).toUpperCase());
  const [accentCode, setAccentCode] = useState(accent);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(draft?.coverUrl ?? null);
  const [liveResults, setLiveResults] = useState(draft?.showLiveResults ?? true);
  const [hideLast, setHideLast] = useState(draft ? draft.hideLastHours !== null : true);
  const [limitPhone, setLimitPhone] = useState(draft ? draft.maxVotesPerPhone !== null : false);
  const [signIn, setSignIn] = useState(draft?.voterSignIn ?? "member_id_email");
  const [allowBlank, setAllowBlank] = useState(draft?.allowBlankChoice ?? false);
  const [nominators, setNominators] = useState(draft?.nominators ?? "anyone_code");
  const [feeOn, setFeeOn] = useState(draft ? draft.nominationFeeMinor !== null : false);
  const [feeText, setFeeText] = useState(draft?.nominationFeeMinor != null ? money(draft.nominationFeeMinor) : money(500));
  const [selfNomination, setSelfNomination] = useState(draft?.allowSelfNomination ?? true);
  const [priceText, setPriceText] = useState(money(draft?.priceMinor ?? 100));
  const [picks] = useState<number[]>(draft?.quickPicks?.length ? draft.quickPicks : DEFAULT_QUICK_PICKS);
  const [defaultPick, setDefaultPick] = useState(draft?.defaultPick ?? 10);
  const [rounds, setRounds] = useState<RoundDraft[]>(() =>
    draft?.rounds.length
      ? draft.rounds.map((r) => ({
          key: crypto.randomUUID(),
          name: r.name,
          mode: r.mode,
          opens: local(r.opensAt),
          closes: local(r.closesAt),
          share: r.share,
          advanceMode: r.advanceMode,
          advanceCount: r.advanceCount,
          priceMinor: r.priceMinor,
        }))
      : [],
  );
  const [roundErrors, setRoundErrors] = useState<{ total?: string; dates: Record<string, string> }>({ dates: {} });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [draftState, setDraftState] = useState<DraftState>("idle");
  const coverInput = useRef<HTMLInputElement>(null);

  const priceMinor = parseMoney(priceText, organiser.currency);
  const feeMinor = parseMoney(feeText, organiser.currency);
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

  // Step 4 starts with one round: Public vote, the event dates, 100% (approved O5 rule).
  useEffect(() => {
    if (!paid) return;
    setRounds((rs) => {
      if (rs.length === 0) return [{ key: crypto.randomUUID(), name: "Public vote", mode: "public", opens, closes, share: 100, advanceMode: "all", advanceCount: null, priceMinor: null }];
      // While there is one round it follows the event dates.
      if (rs.length === 1 && (rs[0]!.opens !== opens || rs[0]!.closes !== closes)) return [{ ...rs[0]!, opens, closes }];
      return rs;
    });
  }, [paid, opens, closes]);

  // "Draft saved" shows for 3 seconds.
  useEffect(() => {
    if (draftState !== "saved") return;
    const t = setTimeout(() => setDraftState("idle"), 3000);
    return () => clearTimeout(t);
  }, [draftState]);

  function validate(s: StepKey): boolean {
    const e: Record<string, string | undefined> = {};
    if (s === "basics") {
      if (name.trim().length < 2) e.name = "Enter the event name, like Akoma Music Awards 2026";
      if (slugState === "invalid" || !slug) e.slug = "Use at least 3 letters, numbers or dashes";
      else if (slugState === "taken") e.slug = "This link is taken. Try another.";
      if (!opens) e.opens = type === "tickets" ? "Choose when the event starts" : "Choose when it opens";
      if (type !== "tickets") {
        if (!closes) e.closes = "Choose when it closes";
        if (opens && closes && closes <= opens) e.closes = "Pick a time after it opens";
      }
    }
    if (s === "look" && !accentValid) e.accent = "Enter a colour code like #C2410C";
    if (s === "rules" && type === "nominations" && feeOn && (feeMinor === null || feeMinor <= 0)) e.fee = `Enter a fee, like ${money(500)}`;
    if (s === "price" && (priceMinor === null || priceMinor <= 0)) e.price = `Enter a price, like ${money(100)}`;
    setErrors(e);
    if (s === "rounds") {
      const p = roundProblems(rounds);
      setRoundErrors(p);
      if (p.total || Object.keys(p.dates).length) return false;
    }
    return Object.values(e).every((v) => !v);
  }

  /** Saves everything entered so far. Creates the draft the first time. Returns the event id. */
  async function save(nextStep: number | null): Promise<string | null> {
    if (preview) return id ?? "preview";
    const supabase = createClient();
    if (!supabase) return null;
    const iso = (v: string) => (v ? zonedToIso(v, zone.tz) : null);
    const ordered = paid ? rounds : [];
    // The event window runs from the first round opening to the last one closing.
    const windowOpens = paid && ordered.length ? iso(ordered[0]!.opens) : iso(opens);
    const windowCloses = type === "tickets" ? null : paid && ordered.length ? iso(ordered[ordered.length - 1]!.closes) : iso(closes);
    const row = {
      type,
      name: name.trim() || "Untitled event",
      slug: slug && slugState !== "taken" && slugState !== "invalid" ? slug : undefined,
      opens_at: windowOpens,
      closes_at: windowCloses,
      venue: type === "tickets" ? venue.trim() || null : null,
      accent: accentValid ? accentCode.toLowerCase() : null,
      show_live_results: type === "election" ? false : liveResults,
      hide_results_last_hours: type === "paid_voting" && hideLast ? 24 : null,
      ussd_enabled: false,
      max_votes_per_phone: type === "paid_voting" && limitPhone ? 100 : null,
      voter_sign_in: signIn,
      allow_blank_choice: allowBlank,
      nominators,
      nomination_fee_minor: type === "nominations" && feeOn ? feeMinor : null,
      allow_self_nomination: selfNomination,
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
    } else {
      const { slug: s, ...rest } = row;
      const { error } = await supabase.from("events").update(s ? { ...rest, slug: s } : rest).eq("id", eventId);
      if (error) return null;
    }
    // Drafts have no votes yet, so their rounds are simply written again in the current order.
    const { error: clear } = await supabase.from("rounds").delete().eq("event_id", eventId);
    if (clear) return null;
    const roundRows = (paid ? ordered : [{ name: "Voting", mode: "public" as const, opens, closes, share: 100, advanceMode: "all" as const, advanceCount: null, priceMinor: null }]).map(
      (r, i) => ({
        event_id: eventId,
        tenant_id: organiser.id,
        position: i + 1,
        name: r.name,
        mode: r.mode,
        opens_at: iso(r.opens),
        closes_at: type === "tickets" ? null : iso(r.closes),
        weight_pct: r.share,
        advance_mode: i === 0 ? "all" : r.advanceMode,
        advance_count: i === 0 ? null : r.advanceCount,
        price_minor: r.mode === "public" ? r.priceMinor : null,
      }),
    );
    if (type !== "tickets") {
      const { error: ins } = await supabase.from("rounds").insert(roundRows);
      if (ins) return null;
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

  function go(to: number) {
    setIndex(to);
    setFurthest((f) => Math.max(f, to));
    window.scrollTo({ top: 0 });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !validate(step)) return;
    setBusy(true);
    if (step === "review") {
      const saved = await save(null);
      setBusy(false);
      if (!saved) return setErrors({ form: "We could not save this event. Try again." });
      router.push("/events");
      router.refresh();
      return;
    }
    // From Basics on there is enough to keep a draft, so each step is saved as the organiser goes.
    if (index >= 1) {
      const saved = await save(index + 2);
      if (!saved) {
        setBusy(false);
        return setErrors({ form: "We could not save your progress. Try again." });
      }
    }
    setBusy(false);
    go(index + 1);
  }

  async function saveDraft() {
    setDraftState("saving");
    const saved = await save(index + 1);
    setDraftState(saved ? "saved" : "failed");
  }

  const titles: Record<StepKey, [string, string?]> = {
    type: ["What are you running?", "You can add nominations or tickets to any event later."],
    basics: ["Name your event"],
    look: ["Choose the look", "We filled this in from your organisation. Change it for this event if you like."],
    rounds: ["Plan your rounds", "Most events need one. Add more for heats, finals or judges."],
    rules: [type === "nominations" ? "Set the nomination rules" : "Set the voting rules"],
    price: ["Set the vote price"],
    review: ["Check and save"],
  };
  const [title, subtitle] = titles[step];
  const fee = priceMinor ? percentOf(priceMinor, EXAMPLE_FEE_BASIS_POINTS) : 0;
  const style = accentValid ? ({ "--vx-color-accent": accentCode, "--vx-color-on-accent": onAccent(accentCode) } as React.CSSProperties) : undefined;
  const range = opens && closes ? dateRange(new Date(zonedToIso(opens, zone.tz)), new Date(zonedToIso(closes, zone.tz)), zone.tz) : "Not set";
  const [jobTitle, jobLine] = NEXT_JOB[type];
  const dateLabels: [string, string] = type === "nominations" ? ["Nominations open", "Nominations close"] : ["Voting opens", "Voting closes"];

  let aside: React.ReactNode;
  if (step === "price") aside = <VoterPreview price={priceMinor ?? 0} picks={picks} pick={defaultPick} money={money} />;
  if (step === "rounds" && rounds.length > 1) aside = <WinnerSplit rounds={rounds} />;

  return (
    <form onSubmit={onSubmit} noValidate style={style}>
      <WizardFrame
        steps={steps.map((s) => STEP_LABEL[s])}
        step={index + 1}
        done={(n) => n - 1 < furthest}
        onStep={(n) => setIndex(n - 1)}
        onBack={() => setIndex(Math.max(index - 1, 0))}
        onClose={() => router.push("/events")}
        onSaveDraft={saveDraft}
        draft={draftState}
        title={title}
        subtitle={subtitle}
        primary={step === "review" ? PRIMARY[type] : "Continue"}
        busy={busy}
        aside={aside}
      >
        {step === "type" ? (
          <TypeStep
            value={type}
            onChange={(t) => {
              setType(t);
              setFurthest(0);
            }}
          />
        ) : null}

        {step === "basics" ? (
          <>
            <TextField
              label="Event name"
              autoFocus
              maxLength={120}
              placeholder={type === "tickets" ? "Asanteman Highlife Night 2026" : "Akoma Music Awards 2026"}
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
            {type === "tickets" ? (
              <div className="flex flex-col gap-5 md:flex-row md:gap-4 lg:flex-col lg:gap-5">
                <DateField label="Event starts" value={opens} onChange={setOpens} tz={zone.tz} error={errors.opens} />
                <TextField
                  className="flex-1"
                  label="Venue"
                  maxLength={120}
                  placeholder="National Theatre, Accra"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  helper="Shown on every ticket"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-5 md:flex-row md:gap-4 lg:flex-col lg:gap-5">
                <DateField label={dateLabels[0]} value={opens} onChange={setOpens} tz={zone.tz} error={errors.opens} />
                <DateField label={dateLabels[1]} value={closes} onChange={setCloses} tz={zone.tz} error={errors.closes} />
              </div>
            )}
            <p className="-mt-2 hidden vx-caption text-muted md:block lg:hidden">Times are in {zone.label}.</p>
          </>
        ) : null}

        {step === "look" ? (
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

        {step === "rounds" ? (
          <RoundsStep
            rounds={rounds}
            onChange={(rs) => {
              setRounds(rs);
              setRoundErrors({ dates: {} });
            }}
            tz={zone.tz}
            eventPrice={money(priceMinor ?? 100)}
            money={money}
            currency={organiser.currency}
            totalError={roundErrors.total}
            dateErrors={roundErrors.dates}
          />
        ) : null}

        {step === "rules" && type === "paid_voting" ? (
          <div className="flex flex-col gap-5">
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

        {step === "rules" && type === "election" ? (
          <div className="flex flex-col gap-5">
            <Toggle label="One person, one vote" note="Each voter chooses once per position" checked fixed />
            <Toggle label="Results after voting closes" note="Nobody sees counts before the end" checked fixed />
            <SelectField label="How voters sign in" value={signIn} options={VOTER_SIGN_IN} onChange={setSignIn} />
            <Toggle label="Allow a blank choice" note="Voters can skip a position" checked={allowBlank} onChange={setAllowBlank} />
          </div>
        ) : null}

        {step === "rules" && type === "nominations" ? (
          <div className="flex flex-col gap-5">
            <SelectField label="Who can nominate" value={nominators} options={NOMINATORS} onChange={setNominators} />
            <Toggle label="Charge a nomination fee" note="Paid by the person who nominates" checked={feeOn} onChange={setFeeOn} />
            {feeOn ? (
              <TextField
                label="Fee per nomination"
                inputMode="decimal"
                value={feeText}
                onChange={(e) => setFeeText(e.target.value)}
                onBlur={() => feeMinor !== null && setFeeText(money(feeMinor))}
                helper="Paid by mobile money or card"
                error={errors.fee}
              />
            ) : null}
            <Toggle label="Allow self-nomination" note="People can put their own name forward" checked={selfNomination} onChange={setSelfNomination} />
          </div>
        ) : null}

        {step === "price" ? (
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

        {step === "review" ? (
          <>
            <div className="flex flex-col rounded-md border border-border-strong bg-bg px-4 py-1">
              <Row label="Type" value={TYPE_LABEL[type]} divided />
              <Row label="Name" value={name.trim()} divided />
              <Row label="Link" value={`${siteHost}/${slug}`} divided />
              {type === "paid_voting" ? (
                <>
                  <Row label="Voting" value={range} divided />
                  <Row label="Rounds" value={`${rounds.length} · ${rounds.map((r) => (r.mode === "public" ? "public vote" : "judges")).join(", ")}`} divided />
                  <Row label="Price" value={`${money(priceMinor ?? 0)} per vote`} divided />
                </>
              ) : null}
              {type === "election" ? (
                <>
                  <Row label="Voting" value={range} divided />
                  <Row label="Sign in" value={VOTER_SIGN_IN.find((o) => o.value === signIn)?.short} divided />
                  <Row label="Results" value="After voting closes" divided />
                </>
              ) : null}
              {type === "nominations" ? (
                <>
                  <Row label="Nominations" value={range} divided />
                  <Row label="Who" value={NOMINATORS.find((o) => o.value === nominators)?.short} divided />
                  <Row label="Fee" value={feeOn && feeMinor ? `${money(feeMinor)} per nomination` : "No fee"} divided />
                </>
              ) : null}
              {type === "tickets" ? (
                <>
                  <Row label="Date" value={opens ? pickerDate(zonedToIso(opens, zone.tz), zone.tz) : "Not set"} divided />
                  <Row label="Venue" value={venue.trim() || "Not set"} divided />
                </>
              ) : null}
            </div>
            <div className="flex gap-3 rounded-md bg-info-bg p-4">
              <Icon name="alert" size={20} className="shrink-0 text-info-fg" />
              <div className="flex flex-col gap-0.5">
                <p className="vx-body-md-strong text-fg">{jobTitle}</p>
                <p className="vx-caption text-muted">{jobLine}</p>
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
