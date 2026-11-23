"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageLoading } from "@/components/ui/page-loading";
import { cx } from "@/lib/cx";
import { EXAMPLE_CSV, FIELD_LABEL, checkRows, guessField, parseCsv, problemSentences, rowList, toCsv, type ImportField } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { SelectField } from "@/app/events/wizard/wizard-fields";

// O7 · Import CSV (step 2 approved 22 Nov 2026; steps 1, 3 and done approved 23 Nov 2026).
// 1 Choose the file (moves on by itself) → 2 Match the columns → 3 Check and import. Nothing is added
// until Import is pressed. Desktop: inside the event page. Phone and tablet: full screen with progress.

type Props = {
  event: { id: string; tenantId: string };
  categories: { id: string; name: string }[];
  /** Local design check only: start on a step with a file already read. */
  sample?: { step: number; file: string; rows: string[][] };
};
const FIELDS: ImportField[] = ["name", "category", "photo", "phone", "code", "skip"];
const MAX = 5 * 1024 * 1024;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportFlow({ event, categories, sample }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(sample?.step ?? 1);
  const [file, setFile] = useState<string | null>(sample?.file ?? null);
  const [reading, setReading] = useState(false);
  const [wrongFile, setWrongFile] = useState<string | null>(null);
  const [rows, setRows] = useState<string[][]>(sample?.rows ?? []);
  const [fields, setFields] = useState<ImportField[]>(sample ? sample.rows[0]!.map(guessField) : []);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const back = `/events/${event.id}/contestants`;
  const checked = rows.length ? checkRows(rows, fields, categories.map((c) => c.name)) : null;
  const ready = checked?.ready.length ?? 0;
  const problems = checked?.problems ?? [];
  const sentences = problemSentences(problems);
  const missing = !fields.includes("name") ? "Choose the column with the names" : !fields.includes("category") ? "Choose the column with the categories" : null;

  async function read(f: File | undefined) {
    if (!f) return;
    setWrongFile(null);
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return setWrongFile("This file is not a CSV");
    if (f.size > MAX) return setWrongFile("This file is over 5 MB");
    setFile(f.name);
    setReading(true);
    const parsed = parseCsv(await f.text());
    setReading(false);
    if (parsed.length < 2) return setWrongFile("This file has no rows to import");
    setRows(parsed);
    setFields(parsed[0]!.map(guessField));
    setStep(2);
  }

  async function runImport() {
    if (!checked || !ready) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    // The same name on several rows is one contestant in several categories.
    const byName = new Map<string, { name: string; code: string; phone: string; photo: string; cats: Set<string> }>();
    for (const r of checked.ready) {
      const key = r.name.toLowerCase();
      const p = byName.get(key) ?? { name: r.name, code: r.code, phone: r.phone, photo: r.photo, cats: new Set<string>() };
      p.cats.add(r.category);
      byName.set(key, p);
    }
    const people = [...byName.values()];
    const { data: made, error: e1 } = await supabase
      .from("contestants")
      .insert(people.map((p) => ({ event_id: event.id, tenant_id: event.tenantId, name: p.name, ...(p.code ? { code: p.code } : {}) })))
      .select("id, name");
    if (e1 || !made) {
      setBusy(false);
      return setError(e1?.code === "23505" ? "Some voting codes in the file are already used. Remove them, or leave the column out, and try again." : "We could not import the file. Try again.");
    }
    const idByName = new Map(made.map((m) => [m.name.toLowerCase(), m.id as string]));
    const catId = new Map(categories.map((c) => [c.name, c.id]));
    const entries = people.flatMap((p) => [...p.cats].map((c) => ({ category_id: catId.get(c)!, contestant_id: idByName.get(p.name.toLowerCase())!, tenant_id: event.tenantId })));
    await supabase.from("category_entries").insert(entries);
    const phones = people.filter((p) => p.phone).map((p) => ({ contestant_id: idByName.get(p.name.toLowerCase())!, tenant_id: event.tenantId, phone: p.phone.slice(0, 20) }));
    if (phones.length) await supabase.from("contestant_contacts").insert(phones);
    // Photos are fetched on the server, a few at a time; a link that fails leaves the contestant without a photo.
    const withPhoto = people.filter((p) => p.photo);
    for (let i = 0; i < withPhoto.length; i += 4) {
      await Promise.all(
        withPhoto.slice(i, i + 4).map((p) =>
          fetch(`/events/${event.id}/contestants/import/photo`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ contestantId: idByName.get(p.name.toLowerCase()), url: p.photo }),
          }).catch(() => null),
        ),
      );
    }
    router.push(`${back}?added=${people.length}`);
    router.refresh();
  }

  const titles = ["Choose your file", "Match your columns", "Check and import"];
  const primary =
    step === 1 ? (
      <Button size="md" onClick={() => input.current?.click()} className="max-lg:h-14 max-lg:w-full max-lg:vx-body-lg-strong">
        Choose a file
      </Button>
    ) : step === 2 ? (
      <Button size="md" disabled={Boolean(missing)} onClick={() => setStep(3)} className="max-lg:h-14 max-lg:w-full max-lg:vx-body-lg-strong">
        Continue
      </Button>
    ) : (
      <Button size="md" busy={busy} disabled={!ready} onClick={runImport} className="max-lg:h-14 max-lg:w-full max-lg:vx-body-lg-strong">
        Import {ready} {ready === 1 ? "contestant" : "contestants"}
      </Button>
    );

  return (
    <div className="flex flex-1 flex-col bg-bg lg:bg-transparent">
      {busy ? <PageLoading /> : null}
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-label="CSV file" onChange={(e) => read(e.target.files?.[0])} />

      {/* Phone and tablet header */}
      <header className="flex h-14 items-center px-5 lg:hidden">
        <button
          type="button"
          aria-label="Back"
          onClick={() => (step === 1 ? router.push(back) : setStep(step - 1))}
          className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle"
        >
          <Icon name="chevron-left" />
        </button>
        <span className="flex-1" />
        <button type="button" aria-label="Close" onClick={() => router.push(back)} className="-mr-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
          <Icon name="close" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-[150px] md:mx-auto md:w-[560px] md:px-0 lg:mx-0 lg:w-auto lg:gap-6 lg:px-7 lg:pt-8 lg:pb-10 xl:px-10">
        <div className="flex flex-col gap-2.5 lg:hidden">
          <p className="vx-caption-medium text-muted">Import contestants · {step} of 3</p>
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("h-1 flex-1 rounded-[2px]", n <= step ? "bg-fg" : "bg-border")} />
            ))}
          </div>
        </div>
        <h1 className="vx-heading-xl text-fg lg:hidden">{titles[step - 1]}</h1>
        <div className="hidden flex-col gap-1 lg:flex">
          <h1 className="vx-heading-xl text-fg">Import contestants</h1>
          <p className="vx-body-md text-muted">
            Step {step} of 3 · {titles[step - 1]}
          </p>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-12">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void read(e.dataTransfer.files?.[0]);
              }}
              className={cx(
                "flex flex-col items-center gap-3 rounded-md border border-dashed bg-bg px-6 py-10 text-center lg:w-[584px] lg:py-12",
                dragging ? "border-fg" : wrongFile ? "border-danger-fg" : "border-border-strong",
              )}
            >
              <span aria-hidden className={cx("grid size-12 place-items-center rounded-full", wrongFile ? "bg-danger-bg text-danger-fg" : "bg-subtle text-fg")}>
                <Icon name={wrongFile ? "alert" : "arrow-up"} size={24} />
              </span>
              {wrongFile ? (
                <>
                  <p className="vx-body-lg-strong text-fg">{wrongFile}</p>
                  <p className="vx-body-md text-muted">Save it as .csv from Excel or Google Sheets, then choose it again.</p>
                </>
              ) : reading && file ? (
                <>
                  <p className="vx-body-lg-strong text-fg">{file}</p>
                  <p className="vx-body-md text-muted">Reading the file…</p>
                </>
              ) : (
                <>
                  <p className="vx-body-lg-strong text-fg">
                    <span className="md:hidden">Pick a CSV file</span>
                    <span className="hidden md:inline">Drop your CSV file here</span>
                  </p>
                  <p className="vx-body-md text-muted">
                    <span className="md:hidden">From your phone or Google Drive. Up to 5 MB.</span>
                    <span className="hidden md:inline">Up to 5 MB</span>
                  </p>
                </>
              )}
              <div className="mt-5 hidden lg:block">{primary}</div>
            </div>
            <div className="flex flex-col gap-2 lg:w-[320px] lg:pt-2">
              <p className="vx-body-md-strong text-fg">What the file needs</p>
              {["One row for each contestant", "A name and a category in every row", "Optional: a photo link and a phone number"].map((t) => (
                <p key={t} className="flex gap-2 vx-body-md text-muted">
                  <span aria-hidden>•</span>
                  {t}
                </p>
              ))}
              <button type="button" onClick={() => download("contestants-example.csv", EXAMPLE_CSV)} className="mt-2 flex items-center gap-2 self-start vx-body-md-medium text-fg underline-offset-4 hover:underline">
                <Icon name="arrow-down" size={20} />
                Download an example file
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 && rows.length ? (
          <>
            <div className="flex flex-col gap-5 lg:gap-1 lg:rounded-md lg:border lg:border-border lg:bg-bg lg:p-6">
              <p className="vx-body-lg-strong text-fg">Columns in {file}</p>
              {rows[0]!.map((heading, i) => {
                const example = rows.slice(1).find((r) => (r[i] ?? "").trim())?.[i] ?? "";
                const f = fields[i] ?? "skip";
                const matched = f !== "skip";
                return (
                  <div key={`${heading}-${i}`} className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6 lg:border-t lg:border-border lg:py-2.5">
                    <div className="flex items-center gap-3 lg:w-[392px]">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate vx-body-md-strong text-fg">{heading || `Column ${i + 1}`}</span>
                        <span className="truncate vx-caption text-muted">{example ? `e.g. ${example.length > 28 ? `${example.slice(0, 26)}…` : example}` : "Empty"}</span>
                      </span>
                      <Badge ok={matched} className="lg:hidden" />
                    </div>
                    <Icon name="chevron-right" size={18} className="hidden shrink-0 text-muted lg:block" />
                    <div className="lg:w-[280px]">
                      <SelectField
                        label="Votex field"
                        value={f}
                        onChange={(v) =>
                          setFields((fs) => fs.map((x, j) => (j === i ? (v as ImportField) : v !== "skip" && x === v ? "skip" : x)))
                        }
                        options={FIELDS.map((k) => ({ value: k, label: FIELD_LABEL[k] }))}
                      />
                    </div>
                    <Badge ok={matched} className="max-lg:hidden" />
                  </div>
                );
              })}
            </div>
            {missing ? (
              <Note title={missing} body="Every row needs a name and a category." />
            ) : problems.length ? (
              <Note title={`${ready} ${ready === 1 ? "row is" : "rows are"} ready. ${problems.length} need${problems.length === 1 ? "s" : ""} a fix.`} body={`${sentences.join(" ")} You can skip them on the next step.`} />
            ) : (
              <Note ok title={`All ${ready} rows are ready.`} />
            )}
          </>
        ) : null}

        {step === 3 && checked ? (
          <div className="flex flex-col gap-5 lg:w-[560px]">
            <div className="flex flex-col gap-1">
              <p className="text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] text-fg tabular">{ready}</p>
              <p className="vx-body-lg text-muted">{ready === 1 ? "contestant will be added" : "contestants will be added"}</p>
            </div>
            <div className="flex flex-col rounded-md border border-border-strong bg-bg px-4 py-1">
              {(
                [
                  ["File", file ?? ""],
                  ["Rows in the file", String(rows.length - 1)],
                  ["Will be added", String(ready)],
                  ["Skipped", `${problems.length} ${problems.length === 1 ? "row" : "rows"}`],
                  ["Categories", String(checked.categoriesUsed)],
                  ["With a photo", String(checked.ready.filter((r) => r.photo).length)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-center gap-4 border-b border-border py-3 last:border-0">
                  <span className="flex-1 vx-body-md text-muted">{k}</span>
                  <span className="vx-body-md-medium text-fg tabular">{v}</span>
                </div>
              ))}
            </div>
            {problems.length ? (
              <>
                <Note
                  title={`${problems.length} ${problems.length === 1 ? "row" : "rows"} will be skipped`}
                  body={`${sentences.join(" ")} Download ${problems.length === 1 ? "it" : "them"}, fix ${problems.length === 1 ? "it" : "them"} and import ${problems.length === 1 ? "it" : "them"} again.`}
                />
                <button
                  type="button"
                  onClick={() => download("skipped-rows.csv", toCsv([rows[0]!, ...problems.map((p) => rows[p.line - 1]!)]))}
                  className="flex items-center gap-2 self-start vx-body-md-medium text-fg underline-offset-4 hover:underline"
                  aria-label={`Download the skipped ${rowList(problems.map((p) => p.line)).toLowerCase()}`}
                >
                  <Icon name="arrow-down" size={20} />
                  Download the {problems.length} skipped {problems.length === 1 ? "row" : "rows"}
                </button>
              </>
            ) : null}
            {error ? (
              <p role="alert" className="vx-body-md-medium text-danger-fg">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 lg:flex">
          {step === 1 ? (
            <Button variant="secondary" size="md" onClick={() => router.push(back)} className="min-w-[120px]">
              Cancel
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={() => setStep(step - 1)} disabled={busy} className={step === 3 ? "min-w-[120px]" : undefined}>
              Back
            </Button>
          )}
          <span className="flex-1" />
          {step > 1 ? primary : null}
        </div>
      </div>

      {/* Phone and tablet action area */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))] md:px-[104px] lg:hidden">{primary}</div>
    </div>
  );
}

function Badge({ ok, className }: { ok: boolean; className?: string }) {
  return (
    <span className={cx("h-6 shrink-0 items-center gap-1.5 rounded-sm px-2 vx-caption-medium", ok ? "inline-flex bg-success-bg text-success-fg" : "inline-flex bg-warning-bg text-warning-fg", className)}>
      <span aria-hidden className={cx("size-1.5 rounded-full", ok ? "bg-success-fg" : "bg-warning-fg")} />
      {ok ? "Matched" : "Check"}
    </span>
  );
}

function Note({ title, body, ok }: { title: string; body?: ReactNode; ok?: boolean }) {
  return (
    <div className={cx("flex gap-3 rounded-md p-3.5", ok ? "bg-success-bg" : "bg-warning-bg")}>
      <Icon name={ok ? "check" : "alert"} size={20} className={cx("shrink-0", ok ? "text-success-fg" : "text-warning-fg")} />
      <div className="flex flex-col gap-0.5">
        <p className="vx-body-md-strong text-fg">{title}</p>
        {body ? <p className="vx-caption text-fg">{body}</p> : null}
      </div>
    </div>
  );
}
