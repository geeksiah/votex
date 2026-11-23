import { NextResponse, type NextRequest } from "next/server";
import { safePhotoUrl } from "@/lib/photo-link";
import { createClient } from "@/lib/supabase/server";

// Fetches one contestant photo from a link in an imported CSV and stores it like an uploaded photo.
// Only https links to public hosts, images only, at most 5 MB, at most 3 redirects (each one checked).
// The organiser's own session does the storage write, so storage rules still decide who may add it.

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 5 * 1024 * 1024;

async function fetchImage(start: URL): Promise<{ bytes: Uint8Array; type: string } | null> {
  let url: URL | null = start;
  for (let hop = 0; url && hop < 4; hop++) {
    const res: Response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { accept: "image/*" } });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      url = next ? safePhotoUrl(new URL(next, url).toString()) : null;
      continue;
    }
    if (!res.ok || !res.body) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!TYPES[type] || Number(res.headers.get("content-length") ?? 0) > MAX) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.byteLength;
    }
    return { bytes, type };
  }
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { contestantId?: string; url?: string } | null;
  const url = body?.url ? safePhotoUrl(body.url) : null;
  if (!body?.contestantId || !url) return NextResponse.json({ ok: false, reason: "link" }, { status: 400 });

  // Row-level security only returns the contestant to the organiser's own team.
  const { data: c } = await supabase.from("contestants").select("id, tenant_id, event_id").eq("id", body.contestantId).eq("event_id", eventId).maybeSingle();
  if (!c) return NextResponse.json({ ok: false }, { status: 404 });

  const image = await fetchImage(url).catch(() => null);
  if (!image) return NextResponse.json({ ok: false, reason: "image" }, { status: 422 });

  const path = `${c.tenant_id}/${c.event_id}/${c.id}-${Date.now()}.${TYPES[image.type]}`;
  const { error } = await supabase.storage.from("contestant-photos").upload(path, image.bytes, { contentType: image.type });
  if (error) return NextResponse.json({ ok: false }, { status: 403 });
  const { error: save } = await supabase.from("contestants").update({ photo_path: path }).eq("id", c.id);
  if (save) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true });
}
