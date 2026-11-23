"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { parseMoney } from "@/lib/money";
import { SelectField } from "@/app/events/wizard/wizard-fields";
import type { CategoryItem } from "./categories-view";

// "Pattern · Bulk select" confirmations: they say exactly what will happen (approved 22 Nov 2026).
// Desktop: a centred dialog. Phone and tablet: a sheet from the bottom.

function Dialog({ title, children, actions, onCancel }: { title: string; children: ReactNode; actions: ReactNode; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-fg/40" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-bg px-6 pt-2 pb-[max(34px,env(safe-area-inset-bottom))] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[480px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-md lg:border lg:border-border lg:p-7">
        <span aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-[2px] bg-border-strong lg:hidden" />
        <h2 className="vx-heading-lg text-fg">{title}</h2>
        {children}
        <div className="mt-1 flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-end">{actions}</div>
      </div>
    </div>
  );
}

export function BulkConfirm({ items, onCancel, onConfirm }: { items: CategoryItem[]; onCancel: () => void; onConfirm: () => void }) {
  const blocked = items.filter((c) => c.votes > 0);
  const free = items.length - blocked.length;
  const noun = (n: number) => `${n} ${n === 1 ? "category" : "categories"}`;
  const line = (c: CategoryItem) =>
    `${c.contestants === 0 ? "No contestants" : `${c.contestants} ${c.contestants === 1 ? "contestant" : "contestants"}`}, ${c.votes === 0 ? "no votes" : `${c.votes} votes`}`;
  return (
    <Dialog
      title={`Delete ${noun(items.length)}?`}
      onCancel={onCancel}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={onCancel} className="max-lg:h-14">
            Cancel
          </Button>
          {free > 0 ? (
            <Button size="md" onClick={onConfirm} className="bg-danger-fg max-lg:h-14">
              Delete {noun(free)}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col">
        {items.map((c) => (
          <div key={c.id} className="flex flex-col gap-0.5 border-b border-border py-3">
            <span className="vx-body-md-strong text-fg">{c.name}</span>
            <span className="vx-caption text-muted">{line(c)}</span>
          </div>
        ))}
      </div>
      {blocked.length ? (
        <p className="vx-caption text-danger-fg">
          {blocked.map((c) => c.name).join(" and ")} {blocked.length === 1 ? "has" : "have"} votes, and votes are never deleted. Hide them instead.
        </p>
      ) : null}
      <p className="vx-caption text-muted">Contestants stay in your contestant list. You can undo for 30 days.</p>
    </Dialog>
  );
}

export function BulkGroupDialog({
  count,
  groups,
  onCancel,
  onConfirm,
}: {
  count: number;
  groups: string[];
  onCancel: () => void;
  onConfirm: (group: string | null) => void;
}) {
  const [choice, setChoice] = useState(groups[0] ?? "__new");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  return (
    <Dialog
      title={`Move ${count} to a group`}
      onCancel={onCancel}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={onCancel} className="max-lg:h-14">
            Cancel
          </Button>
          <Button
            size="md"
            className="max-lg:h-14"
            onClick={() => {
              if (choice === "__new" && !name.trim()) return setError("Enter a group name, like Main awards");
              onConfirm(choice === "__none" ? null : choice === "__new" ? name.trim() : choice);
            }}
          >
            Move
          </Button>
        </>
      }
    >
      <SelectField
        label="Group"
        value={choice}
        onChange={setChoice}
        options={[...groups.map((g) => ({ value: g, label: g })), { value: "__new", label: "New group" }, { value: "__none", label: "No group" }]}
      />
      {choice === "__new" ? <TextField label="Group name" value={name} maxLength={60} placeholder="Main awards" onChange={(e) => setName(e.target.value)} error={error} autoFocus /> : null}
    </Dialog>
  );
}

export function BulkPriceDialog({
  count,
  currency,
  eventPrice,
  live,
  onCancel,
  onConfirm,
}: {
  count: number;
  currency: string;
  eventPrice: string;
  live: boolean;
  onCancel: () => void;
  onConfirm: (price: number | null, reason: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog
      title={`Set the price for ${count}`}
      onCancel={onCancel}
      actions={
        <>
          <Button variant="quiet" size="md" onClick={() => onConfirm(null, live ? reason.trim() || null : null)} className="max-lg:h-14">
            Use the event price ({eventPrice})
          </Button>
          <Button
            size="md"
            className="max-lg:h-14"
            onClick={() => {
              const p = parseMoney(text, currency);
              const e: Record<string, string> = {};
              if (p === null || p <= 0) e.price = "Enter a price, like GH₵ 2.00";
              if (live && !reason.trim()) e.reason = "Say why the price changes";
              setErrors(e);
              if (Object.keys(e).length) return;
              onConfirm(p, live ? reason.trim() : null);
            }}
          >
            Set price
          </Button>
        </>
      }
    >
      <TextField label="Price per vote" inputMode="decimal" value={text} placeholder="GH₵ 2.00" onChange={(e) => setText(e.target.value)} error={errors.price} autoFocus />
      {live ? (
        <>
          <p className="vx-caption text-muted">Voting is open. The new price applies to new votes only. We log the change with your reason.</p>
          <TextField label="Reason for the change" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} error={errors.reason} valueSize="md" />
        </>
      ) : null}
    </Dialog>
  );
}
