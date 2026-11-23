"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { cx } from "@/lib/cx";
import { formatMoney, parseMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { OptionCard, SelectField, Toggle } from "@/app/events/wizard/wizard-fields";
import type { CategoryItem } from "./categories-view";

// O6 · Edit category (approved 22 Nov 2026). Desktop: side panel. Tablet: sheet. Phone: full page.
// Changing a price while voting is open needs a reason; the change applies to new votes only and is logged.

type Props = {
  event: { id: string; tenantId: string; status: string; type: string; currency: string; priceMinor: number | null };
  category: CategoryItem | null;
  groups: string[];
  nextPosition: number;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function CategoryEditor({ event, category, groups, nextPosition, onClose, onSaved }: Props) {
  const money = (m: number) => formatMoney({ minor: m, currency: event.currency });
  const live = event.status === "live" || event.status === "paused";
  const [name, setName] = useState(category?.name ?? "");
  const [group, setGroup] = useState(category?.group ?? (groups[0] ? groups[0] : "__none"));
  const [newGroup, setNewGroup] = useState("");
  const [own, setOwn] = useState(category?.priceMinor != null);
  const [price, setPrice] = useState(category?.priceMinor != null ? money(category.priceMinor) : "");
  const [reason, setReason] = useState("");
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const priceMinor = own ? parseMoney(price, event.currency) : null;
  const priceChanged = Boolean(category) && (priceMinor ?? null) !== (category?.priceMinor ?? null);

  async function save() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Enter a name, like Best Highlife Song";
    if (group === "__new" && !newGroup.trim()) e.group = "Enter a group name, like Main awards";
    if (own && (priceMinor === null || priceMinor <= 0)) e.price = `Enter a price, like ${money(200)}`;
    if (live && priceChanged && !reason.trim()) e.reason = "Say why the price changes";
    setErrors(e);
    if (Object.keys(e).length) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    const row = {
      name: name.trim(),
      group_name: group === "__none" ? null : group === "__new" ? newGroup.trim() : group,
      price_minor: priceMinor,
      visible,
    };
    const { error } = category
      ? await supabase.from("categories").update(row).eq("id", category.id)
      : await supabase.from("categories").insert({ ...row, event_id: event.id, tenant_id: event.tenantId, position: nextPosition });
    if (error) {
      setBusy(false);
      setErrors({ name: error.code === "23505" ? "There is already a category with this name" : "We could not save this. Try again." });
      return;
    }
    if (live && priceChanged && category) {
      await supabase.rpc("log_activity", {
        p_tenant: event.tenantId,
        p_action: "category.price_changed",
        p_target_type: "category",
        p_target_id: category.id,
        p_reason: reason.trim(),
        p_data: { from: category.priceMinor, to: priceMinor },
      });
    }
    onSaved(category ? "Changes saved" : `Added ${row.name}`);
  }

  const title = category ? "Edit category" : "Add category";

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 hidden bg-fg/40 md:block" />
      <div
        className={cx(
          "absolute inset-0 flex flex-col bg-bg",
          "md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[90dvh] md:rounded-t-[20px]",
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[480px] lg:rounded-none lg:shadow-[0_8px_24px_rgba(0,0,0,0.1)]",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 px-5 md:hidden">
          <button type="button" aria-label="Back" onClick={onClose} className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="chevron-left" />
          </button>
          <span className="vx-body-lg-strong text-fg">{title}</span>
        </header>
        <header className="hidden h-[72px] shrink-0 items-center border-b border-border pr-6 pl-8 md:flex">
          <span className="flex-1 text-[20px] leading-[1.3] font-semibold text-fg">{title}</span>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle">
            <Icon name="close" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-2 pb-8 md:px-8 md:pt-5 lg:gap-3.5">
          <TextField label="Name" value={name} maxLength={80} placeholder="Best Highlife Song" onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus={!category} />
          <SelectField
            label="Group"
            value={group}
            onChange={setGroup}
            options={[...groups.map((g) => ({ value: g, label: g })), { value: "__new", label: "New group" }, { value: "__none", label: "No group" }]}
          />
          {group === "__new" ? (
            <TextField label="Group name" value={newGroup} maxLength={60} placeholder="Main awards" onChange={(e) => setNewGroup(e.target.value)} error={errors.group} />
          ) : null}
          {event.type !== "election" ? (
            <>
              <p className="mt-1 vx-caption-strong tracking-[0.02em] text-muted uppercase">Price per vote</p>
              <div role="radiogroup" aria-label="Price per vote" className="flex flex-col gap-3">
                <OptionCard title="Use the event price" line={`${money(event.priceMinor ?? 0)} a vote`} selected={!own} onSelect={() => setOwn(false)} />
                <OptionCard title="Set a price for this category" line="Voters see it before they pay" selected={own} onSelect={() => setOwn(true)} />
              </div>
              {own ? (
                <TextField
                  label="Price per vote"
                  inputMode="decimal"
                  value={price}
                  placeholder={money(200)}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => priceMinor !== null && setPrice(money(priceMinor))}
                  error={errors.price}
                />
              ) : null}
              {live && priceChanged ? (
                <>
                  <div className="flex gap-3 rounded-md bg-warning-bg p-3.5">
                    <Icon name="alert" size={20} className="shrink-0 text-warning-fg" />
                    <div className="flex flex-col gap-0.5">
                      <p className="vx-body-md-strong text-fg">Voting is open</p>
                      <p className="vx-caption text-fg">The new price applies to new votes only. We log the change with your reason.</p>
                    </div>
                  </div>
                  <TextField label="Reason for the change" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} error={errors.reason} valueSize="md" />
                </>
              ) : null}
            </>
          ) : null}
          <Toggle label="Show this category" note="Voters can find it and vote" checked={visible} onChange={setVisible} />
        </div>

        <footer className="flex shrink-0 items-center gap-4 border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-8 md:py-4">
          <button type="button" onClick={onClose} className="hidden vx-body-md-medium text-fg underline-offset-4 hover:underline md:block">
            Cancel
          </button>
          <span className="hidden flex-1 md:block" />
          <Button type="button" onClick={save} busy={busy} block className="md:w-auto lg:h-11 lg:min-w-[160px] lg:px-4 lg:vx-body-md-strong">
            {category ? "Save changes" : "Add category"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
