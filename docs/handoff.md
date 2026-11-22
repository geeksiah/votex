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
- **Build: not started.** Next step is R1 step 1 (foundations) in `docs/build-plan.md`.

## Waiting on the client
- Build plan approval.
- Supabase: the account's free plan already has 2 active projects; pause one or upgrade, then create the Votex project (London region).
- Vercel account (sign up with the GitHub account that owns `geeksiah/votex`).
- Email sender (Resend suggested) and DNS records for eventpeepo.com on Namecheap.
- Paystack test keys as environment variables `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` (never pasted in chat).
- Votex fee %, SMS prices, bulk limit.
- USSD deferred (no budget yet).

## Access the new workspace needs
- GitHub: read/write on `geeksiah/votex`.
- Figma: edit access to the file above.
- Supabase: the organisation that will hold the Votex project.
