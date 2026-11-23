import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, freshDb } from "./db";

// Two organisers that must never see each other's data.
const KOFI = "11111111-1111-4111-8111-111111111111"; // owner, Akoma Events
const ESI = "22222222-2222-4222-8222-222222222222"; // owner, Kumasi Campus Awards
const YAW = "33333333-3333-4333-8333-333333333333"; // viewer at Akoma Events
const ABENA = "44444444-4444-4444-8444-444444444444"; // admin at Akoma Events

let db: PGlite;
let akoma: string;
let campus: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

beforeAll(async () => {
  db = await freshDb();
  await addUser(db, KOFI, "kofi@akomaevents.com");
  await addUser(db, ESI, "esi@kca.edu.gh");
  await addUser(db, YAW, "yaw@akomaevents.com");
  await addUser(db, ABENA, "abena@akomaevents.com");

  akoma = await as(db, KOFI, async () => (await one<{ id: string }>(`select public.create_tenant('Akoma Events') as id`))[0]!.id);
  campus = await as(db, ESI, async () => (await one<{ id: string }>(`select public.create_tenant('Kumasi Campus Awards') as id`))[0]!.id);

  await as(db, KOFI, async () => {
    await one(`insert into public.tenant_members (tenant_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'admin')`, [akoma, YAW, ABENA]);
    await one(
      `insert into public.events (tenant_id, type, status, name, slug, price_minor) values
        ($1, 'paid_voting', 'live', 'Miss Ashanti 2026', 'miss-ashanti-2026', 100),
        ($1, 'paid_voting', 'draft', 'Ghana Gospel Awards', 'ghana-gospel-awards', 200)`,
      [akoma],
    );
  });
  await as(db, ESI, async () => {
    await one(`insert into public.events (tenant_id, type, status, name, slug) values ($1, 'election', 'draft', 'SRC Elections 2026', 'src-2026')`, [campus]);
  });
});

describe("data walls", () => {
  it("members see only their own organiser", async () => {
    const rows = await as(db, KOFI, () => one<{ name: string }>(`select name from public.tenants`));
    expect(rows.map((r) => r.name)).toEqual(["Akoma Events"]);
    const esiRows = await as(db, ESI, () => one<{ name: string }>(`select name from public.tenants`));
    expect(esiRows.map((r) => r.name)).toEqual(["Kumasi Campus Awards"]);
  });

  it("drafts stay inside the organiser; published events are public", async () => {
    const esiSees = await as(db, ESI, () => one<{ slug: string }>(`select slug from public.events order by slug`));
    expect(esiSees.map((r) => r.slug)).toEqual(["miss-ashanti-2026", "src-2026"]);
    const anonSees = await as(db, null, () => one<{ slug: string }>(`select slug from public.events`));
    expect(anonSees.map((r) => r.slug)).toEqual(["miss-ashanti-2026"]);
  });

  it("anon cannot read organisers, teams or activity", async () => {
    for (const table of ["tenants", "tenant_members", "audit_log"]) {
      await expect(as(db, null, () => one(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("one organiser cannot change another's events", async () => {
    const updated = await as(db, ESI, () => one(`update public.events set name = 'Taken' where tenant_id = $1 returning id`, [akoma]));
    expect(updated).toHaveLength(0);
    await expect(
      as(db, ESI, () => one(`insert into public.events (tenant_id, type, name, slug) values ($1, 'free_poll', 'Sneaky', 'sneaky')`, [akoma])),
    ).rejects.toThrow(/row-level security/);
  });

  it("events never move to another organiser", async () => {
    await expect(as(db, KOFI, () => one(`update public.events set tenant_id = $1`, [campus]))).rejects.toThrow(/permission denied/);
  });

  it("people cannot add themselves to another organiser", async () => {
    await expect(
      as(db, ESI, () => one(`insert into public.tenant_members (tenant_id, user_id, role) values ($1, $2, 'owner')`, [akoma, ESI])),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("roles", () => {
  it("viewers read but cannot edit", async () => {
    const seen = await as(db, YAW, () => one(`select id from public.events`));
    expect(seen.length).toBe(2);
    const updated = await as(db, YAW, () => one(`update public.events set name = 'Changed' returning id`));
    expect(updated).toHaveLength(0);
  });

  it("admins cannot make owners or touch owners", async () => {
    await expect(
      as(db, ABENA, () => one(`update public.tenant_members set role = 'owner' where user_id = $1`, [ABENA])),
    ).rejects.toThrow(/row-level security/);
    const removed = await as(db, ABENA, () => one(`delete from public.tenant_members where user_id = $1 returning user_id`, [KOFI]));
    expect(removed).toHaveLength(0);
  });

  it("the last owner cannot leave", async () => {
    await expect(as(db, KOFI, () => one(`delete from public.tenant_members where user_id = $1`, [KOFI]))).rejects.toThrow(/at least one owner/);
  });

  it("organisers cannot switch on the SMS add-on themselves", async () => {
    await expect(as(db, KOFI, () => one(`update public.tenants set sms_enabled = true`))).rejects.toThrow(/permission denied/);
  });

  it("owners can rename their organiser", async () => {
    const rows = await as(db, KOFI, () => one<{ name: string }>(`update public.tenants set name = 'Akoma Events Ltd' returning name`));
    expect(rows[0]?.name).toBe("Akoma Events Ltd");
  });
});

describe("activity log", () => {
  it("records actions and is append-only", async () => {
    const id = await as(db, ABENA, async () =>
      (await one<{ id: number }>(`select public.log_activity($1, 'event.paused', 'event', 'x', 'Power cut at venue') as id`, [akoma]))[0]!.id,
    );
    expect(id).toBeGreaterThan(0);
    await expect(as(db, KOFI, () => one(`update public.audit_log set reason = 'edited'`))).rejects.toThrow(/permission denied/);
    await expect(as(db, KOFI, () => one(`delete from public.audit_log`))).rejects.toThrow(/permission denied/);
    // Even a role that bypasses RLS cannot rewrite history.
    await expect(one(`update public.audit_log set reason = 'edited'`)).rejects.toThrow(/append-only/);
  });

  it("cannot log into another organiser", async () => {
    await expect(as(db, ESI, () => one(`select public.log_activity($1, 'event.paused')`, [akoma]))).rejects.toThrow(/Not a member/);
  });

  it("viewers cannot read the log; other organisers see nothing", async () => {
    expect(await as(db, YAW, () => one(`select id from public.audit_log`))).toHaveLength(0);
    const esiSees = await as(db, ESI, () => one<{ tenant_id: string }>(`select tenant_id from public.audit_log`));
    expect(esiSees.every((r) => r.tenant_id === campus)).toBe(true);
  });
});

describe("onboarding", () => {
  it("creates the organiser with its country and main currency", async () => {
    const NANA = "55555555-5555-4555-8555-555555555555";
    await addUser(db, NANA, "nana@lagosawards.ng");
    const id = await as(db, NANA, async () => (await one<{ id: string }>(`select public.create_tenant('Lagos Campus Awards', 'ng', 'ngn') as id`))[0]!.id);
    const rows = await as(db, NANA, () => one<{ country: string; default_currency: string }>(`select country, default_currency from public.tenants where id = $1`, [id]));
    expect(rows).toEqual([{ country: "NG", default_currency: "NGN" }]);
  });

  it("defaults to Ghana and cedis", async () => {
    const rows = await as(db, KOFI, () => one<{ country: string; default_currency: string }>(`select country, default_currency from public.tenants where id = $1`, [akoma]));
    expect(rows).toEqual([{ country: "GH", default_currency: "GHS" }]);
  });

  it("anon cannot create an organiser", async () => {
    await expect(as(db, null, () => one(`select public.create_tenant('Fake Org')`))).rejects.toThrow();
  });
});

describe("logo storage", () => {
  const put = (user: string | null, path: string) =>
    as(db, user, () => one(`insert into storage.objects (bucket_id, name) values ('tenant-logos', $1)`, [path]));

  it("owners and admins upload into their own organiser's folder", async () => {
    await put(KOFI, `${akoma}/logo-1.png`);
    await put(ABENA, `${akoma}/logo-2.png`);
  });

  it("viewers, other organisers and anon cannot upload", async () => {
    await expect(put(YAW, `${akoma}/logo-3.png`)).rejects.toThrow();
    await expect(put(ESI, `${akoma}/logo-4.png`)).rejects.toThrow();
    await expect(put(null, `${akoma}/logo-5.png`)).rejects.toThrow();
  });

  it("paths outside an organiser folder are refused", async () => {
    await expect(put(KOFI, `logo.png`)).rejects.toThrow();
    await expect(put(KOFI, `not-an-id/logo.png`)).rejects.toThrow();
  });

  it("other organisers cannot remove a logo", async () => {
    const removed = await as(db, ESI, () => one(`delete from storage.objects where name = $1 returning id`, [`${akoma}/logo-1.png`]));
    expect(removed).toEqual([]);
  });
});

describe("event wizard", () => {
  const eventId = async (slug: string) =>
    (await as(db, KOFI, () => one<{ id: string }>(`select id from public.events where slug = $1`, [slug])))[0]!.id;

  it("owners add rounds to their own events; others cannot", async () => {
    const id = await eventId("ghana-gospel-awards");
    await as(db, KOFI, () => one(`insert into public.rounds (event_id, tenant_id, position, name) values ($1, $2, 1, 'Public vote')`, [id, akoma]));
    await expect(
      as(db, ESI, () => one(`insert into public.rounds (event_id, tenant_id, position, name) values ($1, $2, 2, 'Judges')`, [id, akoma])),
    ).rejects.toThrow();
    await expect(
      as(db, YAW, () => one(`insert into public.rounds (event_id, tenant_id, position, name) values ($1, $2, 2, 'Judges')`, [id, akoma])),
    ).rejects.toThrow();
  });

  it("a round cannot point at another organiser's event", async () => {
    const id = await eventId("ghana-gospel-awards");
    await expect(
      as(db, ESI, () => one(`insert into public.rounds (event_id, tenant_id, position, name) values ($1, $2, 3, 'Sneaky')`, [id, campus])),
    ).rejects.toThrow();
  });

  it("draft rounds stay private; published ones are public", async () => {
    const live = await eventId("miss-ashanti-2026");
    await as(db, KOFI, () => one(`insert into public.rounds (event_id, tenant_id, position, name) values ($1, $2, 1, 'Public vote')`, [live, akoma]));
    const seen = await as(db, null, () => one<{ name: string }>(`select r.name from public.rounds r join public.events e on e.id = r.event_id where e.tenant_id = $1`, [akoma]));
    expect(seen).toEqual([{ name: "Public vote" }]);
  });

  it("checks event links across all organisers, drafts included", async () => {
    const free = (slug: string) => as(db, ESI, async () => (await one<{ ok: boolean }>(`select public.event_slug_available($1) as ok`, [slug]))[0]!.ok);
    expect(await free("ghana-gospel-awards")).toBe(false);
    expect(await free("akoma26")).toBe(true);
    expect(await free("sign-in")).toBe(false);
    expect(await free("Bad Link")).toBe(false);
    expect(await free("ab")).toBe(false);
  });

  it("an event keeps its own link when checked against itself", async () => {
    const id = await eventId("ghana-gospel-awards");
    const ok = await as(db, KOFI, async () => (await one<{ ok: boolean }>(`select public.event_slug_available('ghana-gospel-awards', $1) as ok`, [id]))[0]!.ok);
    expect(ok).toBe(true);
  });

  it("anon cannot probe event links", async () => {
    await expect(as(db, null, () => one(`select public.event_slug_available('akoma26')`))).rejects.toThrow();
  });
});

describe("categories and contestants", () => {
  const eventId = async (slug: string) =>
    (await as(db, KOFI, () => one<{ id: string }>(`select id from public.events where slug = $1`, [slug])))[0]!.id;

  it("owners add categories and contestants; codes are made from the event name", async () => {
    const id = await eventId("miss-ashanti-2026");
    const cat = await as(db, KOFI, async () => (await one<{ id: string }>(`insert into public.categories (event_id, tenant_id, name, group_name) values ($1, $2, 'Miss Kumasi', 'Regions') returning id`, [id, akoma]))[0]!.id);
    const codes = await as(db, KOFI, () =>
      one<{ code: string }>(`insert into public.contestants (event_id, tenant_id, name) values ($1, $2, 'Akosua Boateng'), ($1, $2, 'Efua Mensah') returning code`, [id, akoma]),
    );
    expect(codes.map((c) => c.code)).toEqual(["MA-001", "MA-002"]);
    const kid = await as(db, KOFI, async () => (await one<{ id: string }>(`select id from public.contestants where code = 'MA-001'`))[0]!.id);
    await as(db, KOFI, () => one(`insert into public.category_entries (category_id, contestant_id, tenant_id) values ($1, $2, $3)`, [cat, kid, akoma]));
  });

  it("viewers and other organisers cannot add or change them", async () => {
    const id = await eventId("miss-ashanti-2026");
    await expect(as(db, YAW, () => one(`insert into public.categories (event_id, tenant_id, name) values ($1, $2, 'Sneaky')`, [id, akoma]))).rejects.toThrow();
    await expect(as(db, ESI, () => one(`insert into public.categories (event_id, tenant_id, name) values ($1, $2, 'Sneaky')`, [id, campus]))).rejects.toThrow();
    const changed = await as(db, ESI, () => one(`update public.categories set name = 'Taken' where event_id = $1 returning id`, [id]));
    expect(changed).toEqual([]);
  });

  it("an entry cannot link a category and a contestant from different events", async () => {
    const live = await eventId("miss-ashanti-2026");
    const draft = await eventId("ghana-gospel-awards");
    const cat = await as(db, KOFI, async () => (await one<{ id: string }>(`insert into public.categories (event_id, tenant_id, name) values ($1, $2, 'Best Choir') returning id`, [draft, akoma]))[0]!.id);
    const kid = await as(db, KOFI, async () => (await one<{ id: string }>(`select id from public.contestants where event_id = $1 limit 1`, [live]))[0]!.id);
    await expect(as(db, KOFI, () => one(`insert into public.category_entries (category_id, contestant_id, tenant_id) values ($1, $2, $3)`, [cat, kid, akoma]))).rejects.toThrow();
  });

  it("visitors see published, visible categories but never contestants' contact details", async () => {
    const kid = await as(db, KOFI, async () => (await one<{ id: string }>(`select id from public.contestants where code = 'MA-001'`))[0]!.id);
    await as(db, KOFI, () => one(`insert into public.contestant_contacts (contestant_id, tenant_id, email) values ($1, $2, 'akosua@example.com')`, [kid, akoma]));
    expect(await as(db, null, () => one(`select name from public.categories where name = 'Miss Kumasi'`))).toEqual([{ name: "Miss Kumasi" }]);
    expect(await as(db, null, () => one(`select name from public.categories where name = 'Best Choir'`))).toEqual([]);
    await expect(as(db, null, () => one(`select email from public.contestant_contacts`))).rejects.toThrow();
    expect(await as(db, ESI, () => one(`select email from public.contestant_contacts`))).toEqual([]);
    expect(await as(db, YAW, () => one(`select email from public.contestant_contacts`))).toEqual([]);
    expect(await as(db, KOFI, () => one(`select email from public.contestant_contacts`))).toEqual([{ email: "akosua@example.com" }]);
  });
});
