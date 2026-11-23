"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-field";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { BulkConfirm, BulkGroupDialog, BulkPriceDialog } from "./bulk-dialogs";
import { CategoryEditor } from "./category-editor";

// O6 · Categories (approved 22 Nov 2026) with "Pattern · Bulk select" (approved 22 Nov 2026).
// Desktop: table with checkboxes, the toolbar turns into a dark action bar. Tablet: fewer columns.
// Phone: list grouped by group; press and hold a row (or tap Select) to select, act from the bottom bar.

export type CategoryItem = {
  id: string;
  name: string;
  group: string | null;
  position: number;
  priceMinor: number | null;
  visible: boolean;
  contestants: number;
  votes: number;
};

type EventInfo = { id: string; tenantId: string; status: string; type: string; currency: string; priceMinor: number | null };
type Filter = "all" | "open" | "hidden" | "own";

const num = (n: number) => new Intl.NumberFormat("en-GH").format(n);

export function CategoriesView({ event, categories, contestants, canEdit }: { event: EventInfo; categories: CategoryItem[]; contestants: number; canEdit: boolean }) {
  const router = useRouter();
  const money = (m: number) => formatMoney({ minor: m, currency: event.currency });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | "new" | null>(null);
  const [dialog, setDialog] = useState<"delete" | "group" | "price" | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [order, setOrder] = useState(categories.map((c) => c.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const ordered = order.map((id) => byId.get(id)).filter((c): c is CategoryItem => Boolean(c));
  // New rows from a refresh are added at the end of the local order.
  for (const c of categories) if (!order.includes(c.id)) ordered.push(c);

  const counts = {
    all: ordered.length,
    open: ordered.filter((c) => c.visible).length,
    hidden: ordered.filter((c) => !c.visible).length,
    own: ordered.filter((c) => c.priceMinor !== null).length,
  };
  const shown = ordered.filter(
    (c) =>
      (filter === "all" || (filter === "open" && c.visible) || (filter === "hidden" && !c.visible) || (filter === "own" && c.priceMinor !== null)) &&
      (!query || c.name.toLowerCase().includes(query.toLowerCase()) || (c.group ?? "").toLowerCase().includes(query.toLowerCase())),
  );
  const picked = ordered.filter((c) => selected.has(c.id));
  const selecting = selected.size > 0 || selectMode;
  const groups = [...new Set(ordered.map((c) => c.group).filter((g): g is string => Boolean(g)))];

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
  const pageAll = shown.length > 0 && shown.every((c) => selected.has(c.id));

  async function update(ids: string[], patch: Record<string, unknown>, done: string, undo?: Record<string, unknown>) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("categories").update(patch).in("id", ids);
    if (error) return setToast({ text: "That did not work. Try again." });
    setToast({
      text: done,
      undo: undo
        ? async () => {
            await supabase.from("categories").update(undo).in("id", ids);
            setToast(null);
            router.refresh();
          }
        : undefined,
    });
    clear();
    router.refresh();
  }

  function exportCsv(rows: CategoryItem[]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Category", "Group", "Contestants", "Votes", "Price per vote", "Status"].map(esc).join(","),
      ...rows.map((c) => [c.name, c.group ?? "", c.contestants, c.votes, money(c.priceMinor ?? event.priceMinor ?? 0), c.visible ? "Open" : "Hidden"].map(esc).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveOrder(next: string[]) {
    setOrder(next);
    const supabase = createClient();
    if (!supabase) return;
    await Promise.all(next.map((id, i) => supabase.from("categories").update({ position: i + 1 }).eq("id", id)));
  }

  const priceCell = (c: CategoryItem) =>
    c.priceMinor !== null ? (
      <span className="flex items-center gap-2">
        <span className="vx-body-md-strong text-fg">{money(c.priceMinor)}</span>
        <span className="rounded-[6px] bg-subtle px-2 py-0.5 vx-caption-medium text-fg">Own price</span>
      </span>
    ) : (
      <span className="vx-body-md text-muted">{money(event.priceMinor ?? 0)}</span>
    );
  const statusBadge = (c: CategoryItem) => (
    <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-sm px-2 vx-caption-medium", c.visible ? "bg-success-bg text-success-fg" : "bg-subtle text-muted")}>
      <span aria-hidden className={cx("size-1.5 rounded-full", c.visible ? "bg-success-fg" : "bg-muted")} />
      {c.visible ? "Open" : "Hidden"}
    </span>
  );

  const actions = [
    { key: "group", label: "Move to group", short: "Move", icon: "list" as const, run: () => setDialog("group") },
    { key: "show", label: "Show", short: "Show", icon: "check" as const, run: () => update([...selected], { visible: true }, `Showing ${selected.size} ${selected.size === 1 ? "category" : "categories"}`, { visible: false }) },
    { key: "hide", label: "Hide", short: "Hide", icon: "chart" as const, run: () => update([...selected], { visible: false }, `Hid ${selected.size} ${selected.size === 1 ? "category" : "categories"}`, { visible: true }) },
    { key: "price", label: "Set price", short: "Price", icon: "wallet" as const, run: () => setDialog("price") },
    { key: "export", label: "Export", short: "Export", icon: "share" as const, run: () => exportCsv(picked) },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-8 md:gap-5 md:px-6 md:pt-7 lg:gap-6 lg:px-7 lg:pt-8 xl:px-10">
      {/* Phone select bar replaces the header while selecting */}
      {selecting ? (
        <div className="-mx-5 -mt-5 flex h-14 items-center gap-3.5 bg-bg px-5 lg:hidden">
          <button type="button" aria-label="Stop selecting" onClick={clear} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="close" />
          </button>
          <span className="flex-1 vx-body-lg-strong text-fg">{selected.size} selected</span>
          <button type="button" onClick={() => setSelected(new Set(shown.map((c) => c.id)))} className="vx-body-md-medium text-fg underline-offset-4 hover:underline">
            Select all
          </button>
        </div>
      ) : null}

      <div className={cx("flex items-center gap-3", selecting && "max-lg:hidden")}>
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.015em] text-fg md:vx-heading-xl">Categories</h1>
          <p className="hidden vx-body-md text-muted md:block">
            {num(ordered.length)} {ordered.length === 1 ? "category" : "categories"} · {num(contestants)} {contestants === 1 ? "contestant" : "contestants"}
            {canEdit && !selecting ? <span className="hidden lg:inline"> · drag to reorder</span> : null}
          </p>
        </div>
        {canEdit && ordered.length > 0 ? (
          <button type="button" onClick={() => setSelectMode(true)} className="vx-body-md-medium text-fg underline-offset-4 hover:underline lg:hidden">
            Select
          </button>
        ) : null}
        {canEdit ? (
          <>
            <Button size="md" onClick={() => setEditing("new")} className="max-md:hidden">
              Add category
            </Button>
            <button type="button" aria-label="Add category" onClick={() => setEditing("new")} className="grid size-10 place-items-center rounded-full bg-primary text-on-primary md:hidden">
              <Icon name="plus" size={20} />
            </button>
          </>
        ) : null}
      </div>

      {/* Tools, or the dark action bar while rows are selected (desktop) */}
      {selected.size > 0 ? (
        <div className="hidden h-[58px] items-center gap-2 rounded-md bg-primary py-2.5 pr-3 pl-4 text-on-primary lg:flex">
          <span className="vx-body-md-strong">{selected.size} selected</span>
          {selected.size < ordered.length ? (
            <button type="button" onClick={() => setSelected(new Set(ordered.map((c) => c.id)))} className="ml-2 vx-body-md-medium underline-offset-4 hover:underline">
              Select all {num(ordered.length)}
            </button>
          ) : null}
          <span className="flex-1" />
          {actions.map((a) => (
            <button key={a.key} type="button" onClick={a.run} className="h-[38px] rounded-sm bg-white/12 px-3 vx-body-md-medium hover:bg-white/20">
              {a.label}
            </button>
          ))}
          <button type="button" onClick={() => setDialog("delete")} className="h-[38px] rounded-sm bg-danger-bg px-3 vx-body-md-medium text-danger-fg">
            Delete
          </button>
          <button type="button" aria-label="Clear selection" onClick={clear} className="grid size-9 place-items-center rounded-sm hover:bg-white/12">
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : (
        <div className={cx("flex flex-col gap-4 lg:flex-row lg:items-center", selecting && "max-lg:hidden")}>
          <SearchField
            label="Search categories"
            placeholder={`Search ${ordered.length > 0 ? `${num(ordered.length)} ` : ""}categories`}
            value={query}
            onValueChange={setQuery}
            className="lg:w-[360px]"
          />
          <div className="hidden gap-2 lg:flex">
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["hidden", "Hidden"],
                ["own", "Own price"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
                className={cx("h-10 rounded-full px-3.5 vx-body-md-medium", filter === k ? "bg-primary text-on-primary" : "border border-border-strong text-fg hover:bg-bg")}
              >
                {label} {counts[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      {ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-bg text-fg">
            <Icon name="list" size={28} />
          </span>
          <h2 className="mt-3 vx-heading-lg text-fg">Add your first category</h2>
          <p className="max-w-[420px] vx-body-lg text-muted">Contestants go into categories, like Best Highlife Song.</p>
        </div>
      ) : (
        <>
          {/* Tablet and desktop table */}
          <div className="hidden rounded-md border border-border bg-bg p-2 md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {canEdit ? (
                    <th className="hidden w-11 py-2.5 pl-3 lg:table-cell">
                      <Checkbox
                        label="Select all on this page"
                        checked={pageAll}
                        mixed={!pageAll && shown.some((c) => selected.has(c.id))}
                        onChange={() => setSelected(pageAll ? new Set() : new Set(shown.map((c) => c.id)))}
                      />
                    </th>
                  ) : null}
                  <Th className="pl-3">Category</Th>
                  <Th className="hidden lg:table-cell">Group</Th>
                  <Th className="text-right">Contestants</Th>
                  <Th className="text-right">Votes</Th>
                  {selected.size > 0 ? null : <Th>{"Price"}<span className="hidden lg:inline"> per vote</span></Th>}
                  <Th className="hidden lg:table-cell">Status</Th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      draggable={canEdit && !selecting && !query && filter === "all"}
                      onDragStart={() => setDragId(c.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!dragId || dragId === c.id) return;
                        const next = ordered.map((x) => x.id).filter((x) => x !== dragId);
                        next.splice(next.indexOf(c.id), 0, dragId);
                        void saveOrder(next);
                        setDragId(null);
                      }}
                      className={cx("border-b border-border last:border-0", on && "bg-subtle")}
                    >
                      {canEdit ? (
                        <td className="hidden py-3 pl-3 lg:table-cell">
                          <Checkbox label={`Select ${c.name}`} checked={on} onChange={() => toggle(c.id)} />
                        </td>
                      ) : null}
                      <td className="py-3 pr-4 pl-3 vx-body-md-strong text-fg">{c.name}</td>
                      <td className="hidden py-3 pr-4 vx-body-md text-fg lg:table-cell">{c.group ?? "—"}</td>
                      <td className="py-3 pr-8 text-right vx-body-md text-fg tabular">{num(c.contestants)}</td>
                      <td className="py-3 pr-8 text-right vx-body-md text-fg tabular">{num(c.votes)}</td>
                      {selected.size > 0 ? null : <td className="py-3 pr-4">{priceCell(c)}</td>}
                      <td className="hidden py-3 pr-4 lg:table-cell">{statusBadge(c)}</td>
                      <td className="py-3 pr-3 text-right">
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

          {/* Phone: grouped list */}
          <div className="-mx-5 flex flex-col md:hidden">
            {groupRows(shown).map(([group, rows]) => (
              <div key={group ?? "none"} className="flex flex-col">
                <p className="px-5 pt-6 pb-2 vx-caption-strong text-muted">{group ?? "No group"}</p>
                {rows.map((c) => {
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
                      onClick={() => {
                        if (selecting) return toggle(c.id);
                        if (canEdit) setEditing(c);
                      }}
                      className={cx("flex h-[76px] items-center gap-3 border-b border-border px-5 text-left select-none", on && "bg-subtle")}
                    >
                      {selecting ? <SelectDot on={on} /> : null}
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate vx-body-lg-medium text-fg">{c.name}</span>
                        <span className="truncate vx-caption text-muted">
                          {num(c.contestants)} contestants · {num(c.votes)} votes
                          {c.priceMinor !== null ? ` · ${money(c.priceMinor)} own price` : ` · ${money(event.priceMinor ?? 0)}`}
                          {c.visible ? "" : " · hidden"}
                        </span>
                      </span>
                      {selecting ? null : <Icon name="chevron-right" size={20} className="shrink-0 text-faint" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Phone bottom actions while selecting */}
      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg px-3 pt-2.5 pb-[max(30px,env(safe-area-inset-bottom))] lg:hidden">
          {[actions[0]!, actions[2]!, actions[4]!].map((a) => (
            <button key={a.key} type="button" disabled={selected.size === 0} onClick={a.run} className="flex flex-1 flex-col items-center gap-1 py-1.5 vx-caption-medium text-fg disabled:opacity-40">
              <Icon name={a.icon} size={22} />
              {a.short}
            </button>
          ))}
          <button type="button" disabled={selected.size === 0} onClick={() => setDialog("delete")} className="flex flex-1 flex-col items-center gap-1 py-1.5 vx-caption-medium text-danger-fg disabled:opacity-40">
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

      {editing ? (
        <CategoryEditor
          event={event}
          category={editing === "new" ? null : editing}
          groups={groups}
          nextPosition={ordered.length + 1}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setToast({ text });
            router.refresh();
          }}
        />
      ) : null}

      {dialog === "delete" ? (
        <BulkConfirm
          items={picked}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            setDialog(null);
            const ids = picked.filter((c) => c.votes === 0).map((c) => c.id);
            await update(ids, { deleted_at: new Date().toISOString() }, `Deleted ${ids.length} ${ids.length === 1 ? "category" : "categories"}`, { deleted_at: null });
          }}
        />
      ) : null}
      {dialog === "group" ? (
        <BulkGroupDialog
          count={selected.size}
          groups={groups}
          onCancel={() => setDialog(null)}
          onConfirm={async (g) => {
            setDialog(null);
            await update([...selected], { group_name: g }, `Moved ${selected.size} to ${g ?? "no group"}`);
          }}
        />
      ) : null}
      {dialog === "price" ? (
        <BulkPriceDialog
          count={selected.size}
          currency={event.currency}
          eventPrice={money(event.priceMinor ?? 0)}
          live={event.status === "live" || event.status === "paused"}
          onCancel={() => setDialog(null)}
          onConfirm={async (price, reason) => {
            setDialog(null);
            const ids = [...selected];
            await update(ids, { price_minor: price }, price === null ? "Back to the event price" : `Price set to ${money(price)}`);
            if (reason) {
              const supabase = createClient();
              await supabase?.rpc("log_activity", {
                p_tenant: event.tenantId,
                p_action: "category.price_changed",
                p_target_type: "event",
                p_target_id: event.id,
                p_reason: reason,
                p_data: { categories: ids, price_minor: price },
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}

function groupRows(rows: CategoryItem[]): [string | null, CategoryItem[]][] {
  const map = new Map<string | null, CategoryItem[]>();
  for (const r of rows) map.set(r.group, [...(map.get(r.group) ?? []), r]);
  return [...map.entries()];
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cx("py-2.5 pr-4 vx-caption-medium font-medium text-muted [&.text-right]:pr-8", className)}>{children}</th>;
}

export function Checkbox({ label, checked, mixed, onChange }: { label: string; checked: boolean; mixed?: boolean; onChange: () => void }) {
  return (
    <label className="grid size-5 cursor-pointer place-items-center">
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={cx(
          "grid size-5 place-items-center rounded-[6px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
          checked || mixed ? "bg-primary text-on-primary" : "border border-border-strong bg-bg",
        )}
      >
        {checked ? <Icon name="check" size={14} /> : mixed ? <span className="h-0.5 w-2.5 rounded-[1px] bg-on-primary" /> : null}
      </span>
    </label>
  );
}

function SelectDot({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cx("grid size-6 shrink-0 place-items-center rounded-full", on ? "bg-primary text-on-primary" : "border border-border-strong")}>
      {on ? <Icon name="check" size={14} /> : null}
    </span>
  );
}
