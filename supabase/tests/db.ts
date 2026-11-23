// Runs the real migrations in an in-process Postgres (PGlite) with a minimal stand-in for Supabase's
// auth schema and roles, so row-level security can be tested without Docker or a hosted project.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const SUPABASE_STANDIN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- The Votex project has "grant API access to new tables automatically" switched off, so tables start
  -- with no grants and the migration must grant what it needs. Functions keep Postgres' default
  -- (execute for PUBLIC), which is why the migration revokes it where needed.
  grant all on all tables in schema public to service_role;
  alter default privileges in schema public grant all on tables to service_role;
`;

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  return db;
}

/** Run statements as a signed-in user (or anon when userId is null), like a request through PostgREST. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(userId ? `set role authenticated; set request.jwt.claim.sub = '${userId}';` : `set role anon; reset request.jwt.claim.sub;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

export async function addUser(db: PGlite, id: string, email: string): Promise<void> {
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
}
