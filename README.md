# Votex

Event Peepo Votex: paid voting, elections, nominations, judging and ticketing for pageants, awards and similar programmes. Multi-tenant web app at votex.eventpeepo.com, plus an embeddable widget and a WordPress plugin.

- Plan and scope: [docs/master-plan.md](docs/master-plan.md)
- Build order: [docs/build-plan.md](docs/build-plan.md)
- Working rules: [AGENTS.md](AGENTS.md)
- Designs (Figma): https://www.figma.com/design/T5E4ufcU3nSuqgyPJfKchN

Status: building R1 step 1 (foundations). Nothing is built until its screens are approved in Figma.

New to the project? Start with [docs/handoff.md](docs/handoff.md).

## Run it

Needs Node 24 and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # fill in the Supabase URL and anon key
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests and database tests (row-level security runs in an in-process Postgres, no Docker needed) |
| `pnpm lint` / `pnpm typecheck` | Code checks |
| `pnpm build` | Production build |
| `pnpm tokens` | Rebuild `src/styles/tokens.css` from `design/tokens.json` (the Figma `vx` variables) |

## Layout

- `design/tokens.json` — design tokens exported from Figma; the CSS is generated from it and a test fails if they drift.
- `src/components/ui/` — components that match the Figma "Components" page.
- `src/lib/` — money (minor units, any currency), contrast checks for event accents, link previews.
- `supabase/migrations/` — database schema and row-level security. `supabase/tests/` proves the data walls.

On Windows, keep the project in a short path (for example `Documents\votex`); very long paths break the build tools.
