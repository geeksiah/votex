# Votex build plan

Status: proposed 22 Nov 2026, waiting for client approval.
Source of truth for screens: Figma file "Votex" (all phases approved). Source of truth for rules: `docs/master-plan.md` and `AGENTS.md`.

## 1. What we build first

Three releases. Each one is usable on its own, and each ends with a pilot on a real event.

| Release | Goal | What is in it |
|---|---|---|
| **R1 · Paid voting** | Run a full paid awards or pageant event end to end | Organiser sign-in and onboarding, verification, Paystack subaccount; create event (7 steps); categories (incl. own price, no-category events), contestants and CSV import; voting rules; voter flows (event page, categories, vote by code, browse, direct link/QR, MoMo or card via Paystack, confirming, receipt); split settlement; results page and live TV/LED screen with remote control; share and embed (links, QR, widget); transactions, refunds, finance; team and roles; activity log and audit report; platform admin (clients, verification, settings, staff and roles, payments, overview); bulk actions on every admin list; all edge states; emails |
| **R2 · Reach and safety** | More votes from more people, safely | USSD voting (`*800*N#`, payment adapter), contestant portal and share cards, offline votes with second approval, fraud flags and review, disputes, SMS add-on (per client), WordPress plugin |
| **R3 · More event types** | Sell to schools, unions, festivals | Elections (voter register, secret ballot, turnout), nominations with form builder, rounds with judges' scores (judge portal), tickets and check-in scanner |

## 2. Order of work (R1)

Each step ends with a working demo on a private staging link for your approval before the next step.

1. **Foundations** — project setup, design tokens and components in code matching Figma, database with per-client data walls (row-level security), sign-in by email code, staging deploy, automatic checks on every change.
2. **Organiser setup** — onboarding, verification upload, Paystack subaccount creation, create-event wizard, categories, contestants, CSV import, voting rules.
3. **Voting and payment** — public event pages, vote by code, browse, MoMo and card through Paystack, webhook checks, the vote ledger (votes counted only after verified payment, each payment counted once), receipts.
4. **Results and live screen** — live counts, results page, TV/LED screen (light and dark, pages, timing) controlled from the dashboard.
5. **Money and team** — transactions, refunds (votes removed, taken from next settlement), finance and settlements, team roles, activity log, audit report download.
6. **Platform admin** — clients, verification queue, platform settings (fee %, USSD base code, SMS price, bulk limit), staff roles (None / View / Manage), payments, overview.
7. **Share and embed** — links, QR codes, embed widget.
8. **Hardening** — load test for show night, security review of payments, sign-in and data walls, accessibility check (WCAG 2.2 AA), all edge states, then a pilot event.

R2 and R3 follow the same pattern.

## 3. Quality gates

- **Money is always right:** automated tests for splitting, rounding in pesewas, webhook checks, double payments and refunds. Every vote traces to one verified payment.
- **Data walls:** tests prove one client can never see another client's data.
- **Show night:** load test before the first live event (target: 300 payments a minute and 5,000 people watching live results at once, then tuned to your largest expected event).
- **Phones first:** voter flows tested on small Android phones and slow networks.
- **Design match:** every screen checked against its approved Figma frame at mobile, tablet and desktop.
- **Security review** before any payment, sign-in or data-wall change goes live.

## 4. What I need from you

| # | What | When | Notes |
|---|---|---|---|
| 1 | **Database (Supabase)** | Step 1 | I can create the project in your Supabase account if you approve the region (London is closest to Ghana). |
| 2 | **Hosting** | Step 1 | A Vercel account (or tell me your preferred host). |
| 3 | **Paystack test keys** | Step 3 | Ghana business account with mobile money, card and subaccounts (split payments) turned on. Add the keys as secrets in the environment settings, never in chat. Live keys only before the pilot. |
| 4 | **Email sender** | Step 1 | An email service account (e.g. Resend or Postmark) and access to the eventpeepo.com DNS so emails are trusted (SPF, DKIM). |
| 5 | **Domain** | Step 8 | Point `vote.eventpeepo.com` to the host (one DNS record). |
| 6 | **Numbers** | Step 2 | Votex fee %, SMS prices, the bulk limit (default 50). Example values are used until then. |
| 7 | **Legal pages** | Step 8 | Terms, privacy policy and refund policy (I can draft them for your lawyer to check). |
| 8 | **Pilot event** | Step 8 | A real client willing to run the first event. |
| 9 | **USSD and SMS providers** | R2 | Provider accounts and the base code (e.g. `*800#`). |

## 5. How we work

- Same approval rule as design: nothing goes live without your OK on staging.
- Small, reviewed changes; every change runs the tests automatically.
- Plain-language rules from `AGENTS.md` apply to every word in the product.
