# Handoff: where things stand

Read this first when picking up the project in a new workspace.

## Read in this order
1. `AGENTS.md` — working rules (no AI-tool traces, Figma approval gate, adaptive design, plain language, bulk actions, gestures).
2. `docs/master-plan.md` — the product, every decision and its date.
3. `docs/build-plan.md` — releases R1–R3, order of work, what the client still has to provide.

## Status (22 Nov 2026)
- **Design: complete and approved** in Figma, file `T5E4ufcU3nSuqgyPJfKchN` (https://www.figma.com/design/T5E4ufcU3nSuqgyPJfKchN).
  - Components page — tokens (`vx · …` variables), text styles, components.
  - Screens / Web App — voter flows B1–B8, B6b.
  - Screens / Admin Dashboard — organiser O1–O19 (incl. O9b judge portal, O17b contestant page), Pattern · Bulk select.
  - Screens / Platform Admin — P1–P8.
  - Screens / States and Messages — edge states, emails, SMS add-on.
- **Build: R1 step 1 (foundations) in progress.** Done: Next.js app, `vx` tokens generated from Figma (`design/tokens.json`), core components, money and contrast helpers, database schema with row-level security and data-wall tests, email-code sign-in (O1 mobile and desktop), link-preview helper, CI checks. Live since 23 Nov 2026: Supabase project `votex` (ref `gheqqjqrbqtnwrszjqcl`, London, free plan; foundations migration applied by hand in the SQL editor, so it is not in Supabase's migration history) and Vercel staging at https://votex-pearl.vercel.app (team eventpeepo, deploys from `main`). Supabase Site URL is staging; allowed redirects are localhost:3100, 127.0.0.1:3100, staging and `votex-*-eventpeepo.vercel.app` previews.
- **Sign-in email (23 Nov 2026):** Supabase sends through Resend (`smtp.resend.com`, port 465, sender `Votex <no-reply@votex.eventpeepo.com>`, domain `votex.eventpeepo.com` verified with DNS on Hostinger). The Magic link and Confirm signup templates carry the 6-digit code (`{{ .Token }}`, also in the subject) plus a same-browser link handled by `/auth/callback`. Limit: 30 auth emails an hour (Supabase Rate Limits), Resend free plan 100 a day. The template wording is interim; match it to the approved email design in "Screens / States and Messages".
- **Design follow-ups:** new platform image for O1 sign-in (decided 22 Nov 2026, see master plan §2 "Images and link previews"); tablet O1 sign-in frame; muted-on-subtle text is 4.40:1 in light mode (below AA) on the Closed badge and empty search field.

## Waiting on the client
- Build plan approval.
- Paystack test keys as environment variables `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` (never pasted in chat).
- Votex fee %, SMS prices, bulk limit.
- USSD deferred (no budget yet).

## Access the new workspace needs
- GitHub: read/write on `geeksiah/votex`.
- Figma: edit access to the file above.
- Supabase: the organisation that will hold the Votex project.
