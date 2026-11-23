"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { cx } from "@/lib/cx";
import { dateRange } from "@/lib/event-display";
import type { AdvanceMode, RoundDraft, RoundMode } from "@/lib/event-setup";
import { parseMoney } from "@/lib/money";
import { zonedToIso } from "@/lib/zoned-time";
import { DateField, OptionCard, SelectField, Toggle } from "./wizard-fields";

// O5 · Rounds (approved 23 Nov 2026): step 4 of the create-event wizard.
// Phone: rows open a full page. Tablet: a sheet with two fields per row. Desktop: a side panel,
// drag handles, and "How the winner is decided" beside the list.

type Props = {
  rounds: RoundDraft[];
  onChange: (rounds: RoundDraft[]) => void;
  tz: string;
  eventPrice: string;
  money: (minor: number) => string;
  currency: string;
  /** Errors shown after Continue. */
  totalError?: string;
  dateErrors: Record<string, string>;
};

const shortRange = (r: RoundDraft, tz: string) =>
  r.opens && r.closes ? dateRange(new Date(zonedToIso(r.opens, tz)), new Date(zonedToIso(r.closes, tz)), tz).replace(/ \d{4}$/, "") : "No dates yet";

const modeLine = (r: RoundDraft, money: (m: number) => string) =>
  r.mode === "judges" ? "judges score" : r.priceMinor != null ? `${money(r.priceMinor)} a vote` : "paid votes";

export function RoundsStep(p: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [reorder, setReorder] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const many = p.rounds.length > 1;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= p.rounds.length) return;
    const next = [...p.rounds];
    const [r] = next.splice(from, 1);
    next.splice(to, 0, r!);
    p.onChange(next);
  };

  const removing = p.rounds.find((r) => r.key === deleting);
  const removingIndex = p.rounds.findIndex((r) => r.key === deleting);

  return (
    <div className="flex flex-col gap-3">
      {many ? (
        <div className="flex items-center">
          <span className="flex-1 vx-body-md-medium text-muted">{reorder ? "Move rounds up or down" : `${p.rounds.length} rounds`}</span>
          <button type="button" onClick={() => setReorder((v) => !v)} className="vx-body-md-medium text-fg underline-offset-4 hover:underline">
            {reorder ? "Done" : "Reorder"}
          </button>
        </div>
      ) : null}

      {p.rounds.map((r, i) => (
        <div
          key={r.key}
          draggable={!reorder}
          onDragStart={() => setDragKey(r.key)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const from = p.rounds.findIndex((x) => x.key === dragKey);
            if (from >= 0) move(from, i);
            setDragKey(null);
          }}
          className={cx("flex items-center gap-3.5 rounded-md border bg-bg p-4", p.dateErrors[r.key] ? "border-danger-fg" : "border-border-strong")}
        >
          {reorder ? null : <Icon name="grip" size={20} className="hidden shrink-0 cursor-grab text-faint lg:block" />}
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle vx-body-md-strong text-fg">
            {i + 1}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate vx-body-md-strong text-fg">{r.name}</span>
            <span className="vx-caption text-muted">
              {reorder ? shortRange(r, p.tz) : `${shortRange(r, p.tz)} · ${modeLine(r, p.money)}`}
              {reorder ? null : <span className="lg:hidden"> · {r.share}%</span>}
            </span>
          </span>
          {reorder ? (
            <span className="flex gap-2">
              <button type="button" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-10 place-items-center rounded-sm border border-border-strong text-fg disabled:opacity-40">
                <Icon name="arrow-up" size={20} />
              </button>
              <button type="button" aria-label={`Move ${r.name} down`} disabled={i === p.rounds.length - 1} onClick={() => move(i, i + 1)} className="grid size-10 place-items-center rounded-sm border border-border-strong text-fg disabled:opacity-40">
                <Icon name="arrow-down" size={20} />
              </button>
            </span>
          ) : (
            <>
              <span className="hidden vx-body-md-strong text-fg lg:inline">{r.share}%</span>
              <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r.key)} className="-m-2 grid size-10 place-items-center rounded-sm text-muted hover:bg-subtle">
                <Icon name="chevron-right" size={20} />
              </button>
            </>
          )}
        </div>
      ))}

      {reorder ? (
        <p className="vx-caption text-muted">Or press and hold a round, then drag it.</p>
      ) : (
        <>
          {many ? (
            p.totalError ? (
              <p role="alert" className="flex items-center gap-2 vx-body-md-medium text-danger-fg">
                <Icon name="alert" size={20} />
                {p.totalError}
              </p>
            ) : (
              <p className="flex items-center gap-2 vx-body-md-medium text-success-fg">
                <Icon name="check" size={20} />
                Shares add up to 100%
              </p>
            )
          ) : null}
          <button type="button" onClick={() => setEditing("new")} className="flex h-[46px] items-center gap-2.5 self-start vx-body-md-medium text-fg underline-offset-4 hover:underline">
            <Icon name="plus" size={20} />
            Add a round
          </button>
        </>
      )}

      {editing ? (
        <RoundEditor
          round={editing === "new" ? null : (p.rounds.find((r) => r.key === editing) ?? null)}
          index={editing === "new" ? p.rounds.length : p.rounds.findIndex((r) => r.key === editing)}
          previous={(() => {
            const i = editing === "new" ? p.rounds.length : p.rounds.findIndex((r) => r.key === editing);
            return i > 0 ? p.rounds[i - 1]! : null;
          })()}
          tz={p.tz}
          eventPrice={p.eventPrice}
          money={p.money}
          currency={p.currency}
          dateError={editing !== "new" ? p.dateErrors[editing] : undefined}
          onCancel={() => setEditing(null)}
          onDelete={editing !== "new" && many ? () => setDeleting(editing) : undefined}
          onSave={(r) => {
            p.onChange(editing === "new" ? [...p.rounds, r] : p.rounds.map((x) => (x.key === r.key ? r : x)));
            setEditing(null);
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDelete
          round={removing}
          next={p.rounds[removingIndex + 1] ?? null}
          index={removingIndex}
          onKeep={() => setDeleting(null)}
          onDelete={() => {
            p.onChange(p.rounds.filter((r) => r.key !== removing.key));
            setDeleting(null);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Desktop aside: the share of each round in the final result. */
export function WinnerSplit({ rounds }: { rounds: RoundDraft[] }) {
  const tones = ["bg-fg", "bg-muted", "bg-border-strong", "bg-faint", "bg-border"];
  return (
    <div className="flex w-[348px] flex-col gap-4 rounded-lg bg-subtle p-6">
      <p className="vx-caption-medium text-muted">How the winner is decided</p>
      <div className="flex flex-col gap-4 rounded-md bg-bg p-5">
        <p className="vx-body-md-strong text-fg">Final result</p>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-[6px]" aria-hidden>
          {rounds.map((r, i) => (
            <span key={r.key} className={tones[i % tones.length]} style={{ flexGrow: Math.max(r.share, 0) }} />
          ))}
        </div>
        {rounds.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2.5">
            <span aria-hidden className={cx("size-2.5 rounded-[2px]", tones[i % tones.length])} />
            <span className="flex-1 vx-body-md text-fg">{r.name}</span>
            <span className="vx-body-md-strong text-fg">{r.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundEditor({
  round,
  index,
  previous,
  tz,
  eventPrice,
  money,
  currency,
  dateError,
  onCancel,
  onDelete,
  onSave,
}: {
  round: RoundDraft | null;
  index: number;
  previous: RoundDraft | null;
  tz: string;
  eventPrice: string;
  money: (minor: number) => string;
  currency: string;
  dateError?: string;
  onCancel: () => void;
  onDelete?: () => void;
  onSave: (r: RoundDraft) => void;
}) {
  const isNew = !round;
  const [name, setName] = useState(round?.name ?? "");
  const [mode, setMode] = useState<RoundMode>(round?.mode ?? "public");
  const [opens, setOpens] = useState(round?.opens ?? previous?.closes ?? "");
  const [closes, setCloses] = useState(round?.closes ?? "");
  const [share, setShare] = useState(String(round?.share ?? ""));
  const [advance, setAdvance] = useState<string>(round ? (round.advanceMode === "top" ? `top-${round.advanceCount}` : round.advanceMode) : "top-5");
  const [priceOn, setPriceOn] = useState(round?.priceMinor != null);
  const [price, setPrice] = useState(round?.priceMinor != null ? money(round.priceMinor) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Swipe down / Esc closes the sheet; the ✕ and Cancel buttons do the same.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const overlap =
    previous?.closes && opens && opens < previous.closes
      ? `Pick a time after ${previous.name} closes (${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(new Date(zonedToIso(previous.closes, tz))).replace(",", "")}, ${previous.closes.slice(11)}).`
      : undefined;
  const opensError = errors.opens ?? overlap ?? (dateError && dateError !== "overlap" ? dateError : undefined);

  function save() {
    const e: Record<string, string> = {};
    const n = Number(share.replace("%", "").trim());
    const priceMinor = priceOn ? parseMoney(price, currency) : null;
    if (name.trim().length < 1) e.name = "Enter a round name, like Top 5 vote";
    if (!opens) e.opens = "Choose when this round opens";
    else if (overlap) e.opens = overlap;
    if (!closes) e.closes = "Choose when this round closes";
    else if (opens && closes <= opens) e.closes = "The round must close after it opens";
    if (!Number.isInteger(n) || n < 0 || n > 100) e.share = "Enter a share from 0 to 100%";
    if (mode === "public" && priceOn && (priceMinor === null || priceMinor <= 0)) e.price = `Enter a price, like ${money(200)}`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const [am, count] = advance.startsWith("top-") ? (["top", Number(advance.slice(4))] as const) : ([advance as AdvanceMode, null] as const);
    onSave({
      key: round?.key ?? crypto.randomUUID(),
      name: name.trim(),
      mode,
      opens,
      closes,
      share: n,
      advanceMode: index === 0 ? "all" : am,
      advanceCount: index === 0 ? null : count,
      priceMinor: mode === "public" && priceOn ? priceMinor : null,
    });
  }

  const title = isNew ? "Add a round" : "Edit round";
  const action = isNew ? "Add round" : "Save round";
  const prevName = previous?.name ?? "the round before";

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onCancel} className="absolute inset-0 hidden bg-fg/40 md:block" />
      <div
        className={cx(
          "absolute flex flex-col bg-bg",
          // Phone: full page. Tablet: bottom sheet. Desktop: 480 side panel.
          "inset-0",
          "md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[90dvh] md:rounded-t-[20px]",
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[480px] lg:rounded-none lg:shadow-[0_8px_24px_rgba(0,0,0,0.1)]",
        )}
      >
        {/* Phone header */}
        <header className="flex h-14 shrink-0 items-center gap-3 px-5 md:hidden">
          <button type="button" aria-label="Back" onClick={onCancel} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="chevron-left" />
          </button>
          <span className="vx-body-lg-strong text-fg">{title}</span>
        </header>
        {/* Tablet and desktop header */}
        <header className="hidden h-[72px] shrink-0 items-center border-b border-border pr-6 pl-8 md:flex">
          <span className="hidden h-1 w-9 md:block lg:hidden" />
          <span className="flex-1 text-[20px] leading-[1.3] font-semibold text-fg">{title}</span>
          <button type="button" aria-label="Close" onClick={onCancel} className="grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="close" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-2 pb-8 md:px-8 md:pt-4 lg:gap-3.5">
          <TextField label="Round name" value={name} maxLength={60} placeholder="Top 5 vote" onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus />
          <div className="flex flex-col gap-2">
            <span className="vx-body-md-medium text-fg">Who decides</span>
            <div role="radiogroup" aria-label="Who decides" className="flex flex-col gap-3 md:flex-row md:gap-4">
              <OptionCard title="Public vote" line="People pay to vote" shortLine="People pay" selected={mode === "public"} onSelect={() => setMode("public")} />
              <OptionCard title="Judges" line="Judges give scores" shortLine="Judges score" selected={mode === "judges"} onSelect={() => setMode("judges")} />
            </div>
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:gap-4">
            <DateField label="Opens" value={opens} onChange={setOpens} tz={tz} error={opensError} short />
            <DateField label="Closes" value={closes} onChange={setCloses} tz={tz} error={errors.closes} short />
          </div>
          <TextField
            label="Share of the final result"
            inputMode="numeric"
            value={share ? `${share.replace("%", "")}%` : ""}
            placeholder="40%"
            onChange={(e) => setShare(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            helper="All rounds together make 100%"
            error={errors.share}
          />
          {index > 0 ? (
            <SelectField
              label="Who moves on"
              value={advance}
              onChange={setAdvance}
              options={[
                { value: "all", label: `Everyone from ${prevName}` },
                ...[3, 5, 10, 20].map((n) => ({ value: `top-${n}`, label: `Top ${n} from ${prevName}` })),
                { value: "pick", label: "I choose who moves on" },
              ]}
            />
          ) : null}
          {mode === "public" ? (
            <>
              <Toggle label="Set a price for this round" note={`The event price is ${eventPrice} a vote`} checked={priceOn} onChange={setPriceOn} />
              {priceOn ? (
                <TextField
                  label="Price per vote"
                  inputMode="decimal"
                  value={price}
                  placeholder={money(200)}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => {
                    const m = parseMoney(price, currency);
                    if (m !== null) setPrice(money(m));
                  }}
                  helper="Only for this round"
                  error={errors.price}
                />
              ) : null}
            </>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={onDelete} className="flex h-11 items-center gap-2 self-start vx-body-md-medium text-danger-fg underline-offset-4 hover:underline">
              <Icon name="trash" size={20} />
              Delete round
            </button>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center gap-4 border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-8 md:py-4">
          <button type="button" onClick={onCancel} className="hidden vx-body-md-medium text-fg underline-offset-4 hover:underline md:block">
            Cancel
          </button>
          <span className="hidden flex-1 md:block" />
          <Button type="button" onClick={save} block className="md:w-auto lg:h-11 lg:px-4 lg:vx-body-md-strong lg:min-w-[160px]">
            {action}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function ConfirmDelete({
  round,
  next,
  index,
  onKeep,
  onDelete,
}: {
  round: RoundDraft;
  next: RoundDraft | null;
  index: number;
  onKeep: () => void;
  onDelete: () => void;
}) {
  const after = next ? ` ${next.name} becomes round ${index + 1}.` : "";
  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true" aria-label={`Delete ${round.name}?`}>
      <button type="button" aria-label="Keep round" onClick={onKeep} className="absolute inset-0 bg-fg/40" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 rounded-t-[20px] bg-bg px-6 pt-2 pb-[max(34px,env(safe-area-inset-bottom))] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg lg:p-6">
        <span aria-hidden className="mx-auto h-1 w-9 rounded-[2px] bg-border-strong lg:hidden" />
        <span className="h-2 lg:hidden" />
        <h2 className="vx-heading-lg text-fg">Delete {round.name}?</h2>
        <p className="vx-body-md text-muted">
          Its dates and its {round.share}% share are removed.{after}
        </p>
        <Button type="button" onClick={onDelete} block>
          Delete round
        </Button>
        <Button type="button" variant="quiet" onClick={onKeep} block>
          Keep round
        </Button>
      </div>
    </div>
  );
}
