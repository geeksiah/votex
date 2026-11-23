"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { cx } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import type { ContestantItem } from "./contestants-view";

// O7 · Add contestant (approved 22 Nov 2026). Desktop: side panel with "Add another after this".
// Tablet: sheet. Phone: full page with "Add another" under the button.

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const CODE = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

type Props = {
  event: { id: string; tenantId: string; name: string };
  contestant: ContestantItem | null;
  categories: { id: string; name: string }[];
  defaultCategory: string | null;
  suggestedCode: string;
  onClose: () => void;
  onSaved: (message: string, addAnother: boolean) => void;
};

export function ContestantEditor({ event, contestant, categories, defaultCategory, suggestedCode, onClose, onSaved }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(contestant?.name ?? "");
  const [cats, setCats] = useState<string[]>(contestant?.categoryIds ?? (defaultCategory ? [defaultCategory] : []));
  const [code, setCode] = useState(contestant?.code ?? suggestedCode);
  const [phone, setPhone] = useState(contestant?.phone ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(contestant?.photoUrl ?? null);
  const [visible, setVisible] = useState(contestant?.visible ?? true);
  const [another, setAnother] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const remaining = categories.filter((c) => !cats.includes(c.id));

  function reset() {
    setName("");
    setPhone("");
    setFile(null);
    setPreview(null);
    setErrors({});
  }

  async function save(addAnother: boolean) {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Enter the name voters see, like Kwame Owusu";
    if (!CODE.test(code)) e.code = "Use capital letters, numbers and dashes, like AMA-032";
    if (phone && !/^\+?[\d\s]{9,16}$/.test(phone.trim())) e.phone = "Enter a phone number, like 020 118 4420";
    setErrors(e);
    if (Object.keys(e).length) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    const fail = (msg: string, field = "name") => {
      setBusy(false);
      setErrors({ [field]: msg });
    };

    let id = contestant?.id;
    if (id) {
      const { error } = await supabase.from("contestants").update({ name: name.trim(), code, visible }).eq("id", id);
      if (error) return fail(error.code === "23505" ? "This code is taken. Try another." : "We could not save this. Try again.", error.code === "23505" ? "code" : "name");
    } else {
      const { data, error } = await supabase
        .from("contestants")
        .insert({ event_id: event.id, tenant_id: event.tenantId, name: name.trim(), code })
        .select("id")
        .single();
      if (error || !data) return fail(error?.code === "23505" ? "This code is taken. Try another." : "We could not save this. Try again.", error?.code === "23505" ? "code" : "name");
      id = data.id as string;
    }

    // Categories: add the new ones, remove the ones taken away.
    const before = contestant?.categoryIds ?? [];
    const add = cats.filter((c) => !before.includes(c));
    const drop = before.filter((c) => !cats.includes(c));
    if (add.length) await supabase.from("category_entries").insert(add.map((category_id) => ({ category_id, contestant_id: id, tenant_id: event.tenantId })));
    if (drop.length) await supabase.from("category_entries").delete().eq("contestant_id", id).in("category_id", drop);

    // Phone lives in the team-only contacts table.
    if (phone.trim() || contestant?.phone) {
      await supabase.from("contestant_contacts").upsert({ contestant_id: id, tenant_id: event.tenantId, phone: phone.trim() || null });
    }

    if (file) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${event.tenantId}/${event.id}/${id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("contestant-photos").upload(path, file, { contentType: file.type });
      if (!error) await supabase.from("contestants").update({ photo_path: path }).eq("id", id);
    }

    setBusy(false);
    const message = contestant ? "Changes saved" : `Added ${name.trim()}, code ${code}`;
    if (addAnother) {
      reset();
      setCode((c) => c.replace(/(\d+)$/, (d) => String(Number(d) + 1).padStart(d.length, "0")));
    }
    onSaved(message, addAnother);
  }

  const title = contestant ? "Edit contestant" : "Add contestant";

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

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-2 pb-8 md:px-8 md:pt-5 lg:gap-[18px]">
          <div className="flex flex-col gap-2">
            <span className="vx-body-md-medium text-fg">Photo</span>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-[76px] items-center gap-3.5 rounded-md border border-border-strong bg-subtle px-3.5 text-left hover:border-fg"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview or Storage upload
                <img src={preview} alt="" className="size-12 shrink-0 rounded-[10px] object-cover" />
              ) : (
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-bg text-fg">
                  <Icon name="plus" size={20} />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate vx-body-md-strong text-fg">{file?.name ?? (preview ? "Change the photo" : "Add a photo")}</span>
                <span className="vx-caption text-muted">Square, clear face, at least 600 × 600</span>
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-label="Photo file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!TYPES.includes(f.type)) return setErrors({ photo: "Choose a PNG, JPG or WebP image" });
                if (f.size > 5 * 1024 * 1024) return setErrors({ photo: "Choose an image under 5 MB" });
                setErrors({});
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
            {errors.photo ? <p className="vx-caption-medium text-danger-fg">{errors.photo}</p> : null}
          </div>

          <TextField label="Name voters see" value={name} maxLength={80} placeholder="Kwame Owusu" onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus={!contestant} />

          <div className="flex flex-col gap-2">
            <span className="vx-body-md-medium text-fg">Categories</span>
            <div className="flex flex-wrap gap-2">
              {cats.map((id) => (
                <span key={id} className="inline-flex h-[34px] items-center gap-1.5 rounded-[16px] bg-subtle pr-2 pl-3 vx-body-md-medium text-fg">
                  {catName.get(id)}
                  <button type="button" aria-label={`Remove ${catName.get(id)}`} onClick={() => setCats(cats.filter((c) => c !== id))} className="grid size-5 place-items-center rounded-full text-muted hover:bg-border">
                    <Icon name="close" size={16} />
                  </button>
                </span>
              ))}
              {remaining.length ? (
                <label className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[16px] border border-border-strong pr-3 pl-2.5 vx-body-md-medium text-fg hover:bg-subtle">
                  <Icon name="plus" size={16} />
                  Add
                  <select
                    aria-label="Add a category"
                    value=""
                    onChange={(e) => e.target.value && setCats([...cats, e.target.value])}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    <option value="">Add a category</option>
                    {remaining.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <p className="vx-caption text-muted">{categories.length ? "Votes are counted separately in each category." : "Add categories first, then put contestants in them."}</p>
          </div>

          <TextField
            label="Voting code"
            value={code}
            maxLength={16}
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            helper="We make this. You can change it before voting opens."
            error={errors.code}
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            maxLength={20}
            placeholder="020 118 4420"
            onChange={(e) => setPhone(e.target.value)}
            helper="We text them their share link and QR."
            error={errors.phone}
          />
          {contestant ? (
            <label className="flex cursor-pointer items-center gap-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="vx-body-md-strong text-fg">Show this contestant</span>
                <span className="vx-caption text-muted">Voters can find them and vote</span>
              </span>
              <input type="checkbox" role="switch" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="peer sr-only" />
              <span aria-hidden className={cx("flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] peer-focus-visible:outline-2 peer-focus-visible:outline-focus", visible ? "justify-end bg-primary" : "justify-start bg-border-strong")}>
                <span className="size-5 rounded-full bg-white" />
              </span>
            </label>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-col gap-1 border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:flex-row md:items-center md:gap-4 md:px-8 md:py-4">
          {contestant ? (
            <button type="button" onClick={onClose} className="hidden vx-body-md-medium text-fg underline-offset-4 hover:underline md:block">
              Cancel
            </button>
          ) : (
            <label className="hidden cursor-pointer items-center gap-2 vx-body-md-medium text-fg md:flex">
              <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="size-4 accent-[var(--vx-color-primary)]" />
              Add another after this
            </label>
          )}
          <span className="hidden flex-1 md:block" />
          <Button type="button" onClick={() => save(another)} busy={busy} block className="md:w-auto lg:h-11 lg:min-w-[160px] lg:px-4 lg:vx-body-md-strong">
            {contestant ? "Save changes" : "Add contestant"}
          </Button>
          {contestant ? null : (
            <button type="button" onClick={() => save(true)} disabled={busy} className="flex h-11 items-center justify-center vx-body-md-medium text-fg underline-offset-4 hover:underline md:hidden">
              Add another
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
