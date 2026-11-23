"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-field";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/event-display";
import { createClient } from "@/lib/supabase/client";
import { SelectField } from "@/app/events/wizard/wizard-fields";
import { Checkbox } from "../categories/categories-view";
import { ContestantEditor } from "./contestant-editor";

// O7 · Contestants (approved 22 Nov 2026) with "Pattern · Bulk select".
// Desktop: table (photo, code, categories, votes, status). Tablet 768: photo grid filtered by category.
// Phone: the contestants of one category, then the list.

export type ContestantItem = {
  id: string;
  name: string;
  code: string;
  photoUrl: string | null;
  visible: boolean;
  categoryIds: string[];
  phone: string | null;
  votes: number;
};

type Cat = { id: string; name: string };
const num = (n: number) => new Intl.NumberFormat("en-GH").format(n);

/** The code the database will give the next contestant, e.g. AMA-032. */
export function nextCode(eventName: string, codes: string[]): string {
  const prefix =
    eventName
      .split(/[^A-Za-z]+/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase())
      .join("")
      .slice(0, 3) || "VX";
  const n = Math.max(0, ...codes.filter((c) => c.startsWith(`${prefix}-`)).map((c) => Number(/-(\d+)$/.exec(c)?.[1] ?? 0)));
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}

export function ContestantsView({
  event,
  contestants,
  categories,
  initialCategory,
  canEdit,
}: {
  event: { id: string; tenantId: string; name: string };
  contestants: ContestantItem[];
  categories: Cat[];
  initialCategory: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editing, setEditing] = useState<ContestantItem | "new" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const shown = contestants.filter(
    (c) =>
      (category === "all" || c.categoryIds.includes(category)) &&
      (!query || c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase())),
  );
  const picked = contestants.filter((c) => selected.has(c.id));
  const selecting = selected.size > 0 || selectMode;
  const pageAll = shown.length > 0 && shown.every((c) => selected.has(c.id));
  const inCategory = category !== "all" ? catName.get(category) : null;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const clear = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  async function update(ids: string[], patch: Record<string, unknown>, done: string, undo?: Record<string, unknown>) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("contestants").update(patch).in("id", ids);
    if (error) return setToast({ text: "That did not work. Try again." });
    setToast({
      text: done,
      undo: undo
        ? async () => {
            await supabase.from("contestants").update(undo).in("id", ids);
            setToast(null);
            router.refresh();
          }
        : undefined,
    });
    clear();
    router.refresh();
  }

  function exportCsv(rows: ContestantItem[]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Name", "Code", "Categories", "Votes", "Status"].map(esc).join(","),
      ...rows.map((c) => [c.name, c.code, c.categoryIds.map((id) => catName.get(id) ?? "").join("; "), c.votes, c.visible ? "Shown" : "Hidden"].map(esc).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contestants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const noun = (n: number) => `${n} ${n === 1 ? "contestant" : "contestants"}`;
  const actions = [
    { key: "show", label: "Show", icon: "check" as const, run: () => update([...selected], { visible: true }, `Showing ${noun(selected.size)}`, { visible: false }) },
    { key: "hide", label: "Hide", icon: "chart" as const, run: () => update([...selected], { visible: false }, `Hid ${noun(selected.size)}`, { visible: true }) },
    { key: "export", label: "Export", icon: "share" as const, run: () => exportCsv(picked) },
  ];
  const avatar = (c: ContestantItem, size: string) =>
    c.photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- organiser uploads from Storage
      <img src={c.photoUrl} alt="" className={cx("shrink-0 rounded-full object-cover", size)} />
    ) : (
      <span aria-hidden className={cx("grid shrink-0 place-items-center rounded-full bg-subtle vx-caption-strong text-muted", size)}>
        {initials(c.name)}
      </span>
    );

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-3 pb-8 md:gap-5 md:px-6 md:pt-7 lg:gap-6 lg:px-7 lg:pt-8 xl:px-10">
      {/* Phone: category bar (back to categories, add), or the select bar */}
      {selecting ? (
        <div className="-mx-5 -mt-3 flex h-14 items-center gap-3.5 bg-bg px-5 lg:hidden">
          <button type="button" aria-label="Stop selecting" onClick={clear} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="close" />
          </button>
          <span className="flex-1 vx-body-lg-strong text-fg">{selected.size} selected</span>
          <button type="button" onClick={() => setSelected(new Set(shown.map((c) => c.id)))} className="vx-body-md-medium text-fg underline-offset-4 hover:underline">
            Select all
          </button>
        </div>
      ) : (
        <div className="-mx-5 -mt-3 flex h-14 items-center gap-3 px-5 md:hidden">
          <Link href={`/events/${event.id}/categories`} aria-label="Categories" className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="chevron-left" />
          </Link>
          <span className="flex-1 truncate vx-body-lg-strong text-fg">{inCategory ?? "Contestants"}</span>
          {canEdit && shown.length ? (
            <button type="button" onClick={() => setSelectMode(true)} className="vx-body-md-medium text-fg underline-offset-4 hover:underline">
              Select
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" aria-label="Add contestant" onClick={() => setEditing("new")} className="grid size-10 place-items-center rounded-full bg-primary text-on-primary">
              <Icon name="plus" size={20} />
            </button>
          ) : null}
        </div>
      )}

      <div className="hidden items-center gap-3 md:flex">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="vx-heading-xl text-fg">Contestants</h1>
          <p className="vx-body-md text-muted">
            {num(contestants.length)} <span className="hidden lg:inline">{contestants.length === 1 ? "contestant" : "contestants"}</span> in {num(categories.length)}{" "}
            {categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        {canEdit ? (
          <>
            <Button size="md" variant="secondary" onClick={() => setSelectMode(true)} className="lg:hidden">
              Select
            </Button>
            <Button size="md" onClick={() => setEditing("new")}>
              Add contestant
            </Button>
          </>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="hidden h-[58px] items-center gap-2 rounded-md bg-primary py-2.5 pr-3 pl-4 text-on-primary lg:flex">
          <span className="vx-body-md-strong">{selected.size} selected</span>
          {selected.size < contestants.length ? (
            <button type="button" onClick={() => setSelected(new Set(contestants.map((c) => c.id)))} className="ml-2 vx-body-md-medium underline-offset-4 hover:underline">
              Select all {num(contestants.length)}
            </button>
          ) : null}
          <span className="flex-1" />
          {actions.map((a) => (
            <button key={a.key} type="button" onClick={a.run} className="h-[38px] rounded-sm bg-white/12 px-3 vx-body-md-medium hover:bg-white/20">
              {a.label}
            </button>
          ))}
          <button type="button" onClick={() => setConfirm(true)} className="h-[38px] rounded-sm bg-danger-bg px-3 vx-body-md-medium text-danger-fg">
            Delete
          </button>
          <button type="button" aria-label="Clear selection" onClick={clear} className="grid size-9 place-items-center rounded-sm hover:bg-white/12">
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : (
        <div className={cx("flex flex-col gap-3 md:flex-row md:items-center md:gap-3 lg:gap-4", selecting && "max-lg:hidden")}>
          <SearchField
            label="Search by name or code"
            placeholder={inCategory ? `Search ${noun(shown.length)}` : "Search by name or code"}
            value={query}
            onValueChange={setQuery}
            className="md:flex-1 lg:w-[360px] lg:flex-none"
          />
          <div className="hidden md:block md:w-[260px]">
            <SelectField
              label="Category"
              value={category}
              onChange={(v) => {
                setCategory(v);
                router.replace(v === "all" ? `/events/${event.id}/contestants` : `/events/${event.id}/contestants?category=${v}`, { scroll: false });
              }}
              options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
        </div>
      )}

      {contestants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-subtle text-fg md:bg-bg">
            <Icon name="users" size={28} />
          </span>
          <h2 className="mt-3 vx-heading-lg text-fg">Add your first contestant</h2>
          <p className="max-w-[420px] vx-body-lg text-muted">Add them one by one. Each gets a voting code.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-md border border-border bg-bg p-2 lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {canEdit ? (
                    <th className="w-11 py-2.5 pl-3">
                      <Checkbox
                        label="Select all on this page"
                        checked={pageAll}
                        mixed={!pageAll && shown.some((c) => selected.has(c.id))}
                        onChange={() => setSelected(pageAll ? new Set() : new Set(shown.map((c) => c.id)))}
                      />
                    </th>
                  ) : null}
                  {["Contestant", "Code", "Category", "Votes", "Status"].map((h) => (
                    <th key={h} className={cx("py-2.5 pr-4 vx-caption-medium font-medium text-muted", h === "Contestant" && "pl-3", h === "Votes" && "pr-8 text-right")}>
                      {h}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const on = selected.has(c.id);
                  const first = c.categoryIds[0] ? catName.get(c.categoryIds[0]) : null;
                  return (
                    <tr key={c.id} className={cx("border-b border-border last:border-0", on && "bg-subtle")}>
                      {canEdit ? (
                        <td className="py-2.5 pl-3">
                          <Checkbox label={`Select ${c.name}`} checked={on} onChange={() => toggle(c.id)} />
                        </td>
                      ) : null}
                      <td className="py-2.5 pr-4 pl-3">
                        <span className="flex items-center gap-3">
                          {avatar(c, "size-9")}
                          <span className="vx-body-md-strong text-fg">{c.name}</span>
                          {c.photoUrl ? null : <span className="rounded-[6px] bg-subtle px-2 py-0.5 vx-caption-medium text-fg">No photo</span>}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 vx-body-md-medium text-fg">{c.code}</td>
                      <td className="py-2.5 pr-4 vx-body-md text-fg">
                        {first ?? <span className="text-muted">No category</span>}
                        {c.categoryIds.length > 1 ? <span className="ml-2 vx-body-md-medium text-muted">+{c.categoryIds.length - 1}</span> : null}
                      </td>
                      <td className="py-2.5 pr-8 text-right vx-body-md text-fg tabular">{num(c.votes)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-sm px-2 vx-caption-medium", c.visible ? "bg-success-bg text-success-fg" : "bg-subtle text-muted")}>
                          <span aria-hidden className={cx("size-1.5 rounded-full", c.visible ? "bg-success-fg" : "bg-muted")} />
                          {c.visible ? "Shown" : "Hidden"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {canEdit ? (
                          <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)} className="-m-2 grid size-9 place-items-center rounded-sm text-muted hover:bg-subtle">
                            <Icon name="chevron-right" size={18} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet photo grid */}
          <div className="hidden grid-cols-3 gap-4 md:grid lg:hidden">
            {shown.map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (selecting ? toggle(c.id) : canEdit && setEditing(c))}
                  className={cx("relative flex flex-col overflow-hidden rounded-md border bg-bg text-left", on ? "border-fg" : "border-border")}
                >
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- organiser uploads from Storage
                    <img src={c.photoUrl} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <span className="grid h-40 place-items-center bg-subtle vx-caption text-muted">No photo yet</span>
                  )}
                  <span className="flex flex-col gap-0.5 px-3.5 pt-3 pb-3.5">
                    <span className="truncate vx-body-md-strong text-fg">{c.name}</span>
                    <span className="vx-caption text-muted">
                      {c.code} · {num(c.votes)} votes{c.visible ? "" : " · hidden"}
                    </span>
                  </span>
                  {selecting ? (
                    <span className="absolute top-2.5 left-2.5">
                      <SelectDot on={on} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Phone list */}
          <div className="flex flex-col md:hidden">
            {shown.map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onPointerDown={() => {
                    if (!canEdit) return;
                    press.current = setTimeout(() => {
                      setSelectMode(true);
                      toggle(c.id);
                      press.current = null;
                    }, 500);
                  }}
                  onPointerUp={() => press.current && clearTimeout(press.current)}
                  onPointerLeave={() => press.current && clearTimeout(press.current)}
                  onClick={() => (selecting ? toggle(c.id) : canEdit && setEditing(c))}
                  className={cx("-mx-5 flex h-[76px] items-center gap-3.5 border-b border-border px-5 text-left select-none", on && "bg-subtle")}
                >
                  {selecting ? <SelectDot on={on} /> : c.photoUrl ? avatar(c, "size-12") : <span aria-hidden className="size-12 shrink-0 rounded-full bg-subtle" />}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate vx-body-md-strong text-fg">{c.name}</span>
                    <span className="truncate vx-caption text-muted">
                      {c.code} · {num(c.votes)} votes{c.photoUrl ? "" : " · no photo"}
                    </span>
                  </span>
                  {selecting ? null : <Icon name="chevron-right" size={20} className="shrink-0 text-muted" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {inCategory && canEdit && !selecting ? (
        <Link href={`/events/${event.id}/categories?edit=${category}`} className="flex h-11 items-center self-start vx-body-md-medium text-fg underline-offset-4 hover:underline md:hidden">
          Edit category
        </Link>
      ) : null}

      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg px-3 pt-2.5 pb-[max(30px,env(safe-area-inset-bottom))] lg:hidden">
          {actions.map((a) => (
            <button key={a.key} type="button" disabled={selected.size === 0} onClick={a.run} className="flex flex-1 flex-col items-center gap-1 py-1.5 vx-caption-medium text-fg disabled:opacity-40">
              <Icon name={a.icon} size={22} />
              {a.label}
            </button>
          ))}
          <button type="button" disabled={selected.size === 0} onClick={() => setConfirm(true)} className="flex flex-1 flex-col items-center gap-1 py-1.5 vx-caption-medium text-danger-fg disabled:opacity-40">
            <Icon name="trash" size={22} />
            Delete
          </button>
        </div>
      ) : null}

      {toast ? (
        <div role="status" className="fixed inset-x-5 bottom-28 z-40 flex items-center gap-3 rounded-md bg-primary px-4 py-3 text-on-primary shadow-[0_8px_24px_rgba(0,0,0,0.1)] md:inset-x-auto md:right-8 md:bottom-8 md:min-w-[360px]">
          <span className="flex-1 vx-body-md-medium">{toast.text}</span>
          {toast.undo ? (
            <button type="button" onClick={toast.undo} className="vx-body-md-strong underline underline-offset-4">
              Undo
            </button>
          ) : null}
          <button type="button" aria-label="Close" onClick={() => setToast(null)} className="grid size-8 place-items-center rounded-sm hover:bg-white/12">
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true" aria-label={`Delete ${noun(picked.length)}?`}>
          <button type="button" aria-label="Cancel" onClick={() => setConfirm(false)} className="absolute inset-0 bg-fg/40" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-bg px-6 pt-2 pb-[max(34px,env(safe-area-inset-bottom))] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[480px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-md lg:border lg:border-border lg:p-7">
            <span aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-[2px] bg-border-strong lg:hidden" />
            <h2 className="vx-heading-lg text-fg">Delete {noun(picked.length)}?</h2>
            <div className="flex flex-col">
              {picked.map((c) => (
                <div key={c.id} className="flex flex-col gap-0.5 border-b border-border py-3">
                  <span className="vx-body-md-strong text-fg">{c.name}</span>
                  <span className="vx-caption text-muted">
                    {c.code} · {c.votes === 0 ? "no votes" : `${num(c.votes)} votes`}
                  </span>
                </div>
              ))}
            </div>
            <p className="vx-caption text-muted">They leave every category. You can undo for 30 days.</p>
            <div className="mt-1 flex flex-col-reverse gap-3 lg:flex-row lg:justify-end">
              <Button variant="secondary" size="md" onClick={() => setConfirm(false)} className="max-lg:h-14">
                Cancel
              </Button>
              <Button
                size="md"
                className="bg-danger-fg max-lg:h-14"
                onClick={async () => {
                  setConfirm(false);
                  const ids = picked.filter((c) => c.votes === 0).map((c) => c.id);
                  await update(ids, { deleted_at: new Date().toISOString() }, `Deleted ${noun(ids.length)}`, { deleted_at: null });
                }}
              >
                Delete {noun(picked.length)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <ContestantEditor
          event={event}
          contestant={editing === "new" ? null : editing}
          categories={categories}
          defaultCategory={category !== "all" ? category : null}
          suggestedCode={nextCode(event.name, contestants.map((c) => c.code))}
          onClose={() => setEditing(null)}
          onSaved={(text, again) => {
            setToast({ text });
            if (!again) setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SelectDot({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cx("grid size-6 shrink-0 place-items-center rounded-full", on ? "bg-primary text-on-primary" : "border border-border-strong bg-bg")}>
      {on ? <Icon name="check" size={14} /> : null}
    </span>
  );
}
