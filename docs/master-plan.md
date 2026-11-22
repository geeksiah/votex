# Votex — Master Plan (v2.1)

Event Peepo Votex: a paid voting, election, nomination, judging and ticketing platform for pageants, awards, elections and similar programs. Multi-tenant web app at **vote.eventpeepo.com**, plus an embeddable widget and a WordPress plugin.

**Status:** Phase 1 direction chosen (see §2). Next: refined direction screens → client confirms → Phase 2 Foundations.
**Order (hard rule):** design in code/Figma → **client confirms the Figma screens** → build. Nothing is built from screens the client has not confirmed in Figma.

**Changes since v2:** direction chosen (B layout + A palette, one variable-length code field, custom vote amounts); elections, nominations, judges' scores, ticketing and rounds are now in scope; money flow, results integrity, show-night load, contestant growth tools, legal and go-to-market added; domain model, flows, dashboard, tables, phases and open questions updated.

---

## 1. Non-negotiable principles

- **Bulk actions** on every admin list (checkboxes on desktop, press-and-hold on mobile) and **phone gestures only where they help**, each with a visible button too — see AGENTS.md rules 8–9 (decided 22 Nov 2026).

- **Mobile first.** Every voter screen is designed at 390×844 first.
- **Adaptive, not stretched.** Every screen (voter, dashboard, admin) is redesigned for tablet and desktop: layout, navigation and interaction change to fit the device (split views, side panels, multi-column grids, keyboard and hover). A phone layout widened to fill a big screen is rejected. Breakpoints to design: **mobile 390**, **tablet 768 (portrait) and 1024 (landscape)**, **desktop 1280+**, plus the embed widths (320 / 480 / 720).
- **Every screen, every state, every breakpoint is in Figma and approved before it is built.**
- **One primary action per screen.** Anything secondary is a quiet text link or lives behind a menu.
- **Generous space, nothing crowded.** If a screen feels busy, split it or cut content.
- **Minimal text.** Headings ≤ 6 words. No marketing voice in the product. Numbers before sentences.
- **Plain language with verbs.** Every label, button and message is simple, short and starts with what to do ("Enter your number", "Try again"). Errors say what happened and what to do next, never blame the user.
- **The platform is neutral; the event brings the colour.** Each tenant/event sets its accent and logo, so the widget fits any host site.
- **Contrast-ready.** WCAG 2.2 AA minimum in every state, including tenant accents (checked automatically).
- **Figma confirmation before build.** Every screen is confirmed by the client in Figma before any code is written for it.

### Anti-"AI look" checklist (reject any screen that has these)

- Editorial serif display type, italic subtitles, uppercase mono "eyebrow" labels, "01 —" section numbering
- Purple/violet as the brand colour, gradient blobs, glassmorphism, glows, emoji
- Marketing lines inside the product ("every night that crowns someone")
- Empty grey boxes standing in for photos; lorem ipsum; generic Western names
- Pill buttons everywhere, oversized hero type on functional screens
- Showcase/specimen pages instead of working screens

**Use instead:** realistic Ghanaian content (names, events, GH₵ amounts, MoMo numbers), real photo crops, real states (loading, error, closed, empty).

---

## 2. Design direction (Phase 1 decision)

**Chosen:** Direction **B layout** (photo-led) with Direction **A palette** (quiet neutrals).

| Topic | Decision |
|---|---|
| Layout | B: contestant photo leads on A2 (full-width 4:5 crop, rounded 16), name + category below, code tag at right |
| Palette | A: white surfaces, zinc neutrals, hairline borders, **near-black primary buttons**. Event accent only on the event logo mark and selected/focus marks — never on the primary button |
| Font | **Familjen Grotesk** (approved 22 Nov 2026), one family, 400/500/600. Full currency glyph set and tabular numerals. Hanken Grotesk dropped (no ₵) |
| Code entry | **One text field, variable length** (codes are not fixed length). No per-character boxes. Auto-uppercase, no autocorrect |
| Vote quantity | Quick picks **1 · 5 · 10 · 50** + **Custom** — voter types any amount; min/max from voting rules, inline error if outside |
| Done | Contestant photo with check badge, "N votes added", receipt card (reference, amount, method, date) |

### Typography
- Scale (px): 13 · 15 · 17 · 20 · 24 · 32 · 40. Weights: 400 / 500 / 600 only.
- Body 15–17, line height 1.45. Headings tight (1.15), slight negative tracking only at ≥ 24.
- Tabular numerals for vote counts and money; legible at 13px.
- **Glyph requirement:** the family must contain the currency symbols of every market we may open (at least ₵ ₦ € £ $ ₹) and tabular numerals. Checked against the actual font files, not the design tool's fallback. Fonts that failed: Hanken Grotesk, Instrument Sans, Onest, Geist, Schibsted Grotesk, Host Grotesk, Funnel Sans, Figtree (no ₵).

### Colour
- Neutral scale: zinc-like cool grey, 50→950, plus white/black.
- Primary action: near-black on light, white on dark. The platform has no signature hue.
- Event accent (tenant-set): one hex → scale generated in OKLCH; on-accent text (black/white) picked automatically by contrast; accents that can't reach AA for their use are rejected.
- Status: success / warning / danger / info, moderately saturated, each with fg / bg / border.
- Light and dark modes. Tokens shipped as CSS variables `--vx-*` and as Figma variables with identical names.

### Layout & spacing
- 4pt base. Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64.
- Refined rhythm (approved 22 Nov 2026): mobile side margin **24**; event header 64; title block 32 top / 8 / 24 to search; search field 52; list rows 76 with 4 between name and meta; group headers 24 above / 8 below; primary button 56; quick-pick chips 52; receipt card radius 16. Desktop: 40 outer padding, 320 list pane with 24 padding, 24 grid gutters.
- Mobile: 24px side margins, single column, primary action pinned in the thumb zone (bottom, safe-area aware).
- Voter flow on tablet/desktop: redesigned, not a centred phone column. Pattern: event header bar on top; categories in a left pane (with search) and the selected category's contestants in the main area; contestant voting opens in a side panel (desktop) or sheet (tablet). Exact layouts are approved per screen in Figma.
- Dashboard: sidebar + content, 12-col grid at ≥ 1024; collapses to bottom nav / stacked on mobile. Fully usable on a phone (organisers run events from phones).
- Radius: 8 (inputs, small), 12 (cards, buttons), 16 (sheets, photos). Hairline borders (1px neutral-200) instead of shadows; one soft shadow level for sheets only.
- Photos: 4:5 portrait crop for contestants, always a real image or a monogram fallback.

### Motion
Short and functional only: 150–200ms ease-out for sheets and state changes; a single success animation on vote confirmed.

---

## 3. Domain model (multi-tenant)

```
Tenant (organiser) ──< Event ──< Stage/Round ──< Category ──< CategoryEntry >── Contestant
                         │                          │
                         │                          ├── VotingRules (event default, category override)
                         │                          └── JudgingCriteria ──< Score (by Judge)
                         ├── NominationPhase ──< Nomination → shortlist → Contestant
                         ├── VoterRegister (elections) ──< BallotToken ··· Ballot (unlinked)
                         └── TicketType ──< Ticket ──< CheckIn
```

- **Tenant:** organisation account; members with roles (Owner, Admin, Finance, Viewer, Judge-coordinator); payout account; branding; optional subdomain / custom domain.
- **Event:** name, type, dates, branding (logo, accent, cover), status (draft / scheduled / live / paused / closed), short event code (for USSD).
- **Event types:**
  - **Paid public voting** (pageants, awards) — pay per vote, many votes per person allowed.
  - **Election** — one person, one vote per category, secret ballot, from a voter register; no payments.
  - **Free poll** — free votes with verification and limits.
- **Stage/Round:** an event has one or more rounds (e.g. Auditions → Top 10 → Final). Each round has its own window, categories, contestants carried over by rule (top N, organiser pick) and a counts-reset option.
- **Category:** belongs to one round; its own rules override event defaults.
- **Contestant:** belongs to an event; contestant code unique per event (to confirm), variable length; may enter several categories (to confirm). Has a contestant portal.
- **Nominations:** public nomination phase (form per category, optional fee, optional verification) → organiser reviews and shortlists → shortlisted nominees become contestants.
- **Judges:** judge accounts invited per event; criteria per category with weights; each judge scores each entry; final result = judges % + public % (configurable, e.g. 60/40); judge scores hidden until the organiser releases them.
- **Elections:** voter register (CSV import, or eligibility by email / phone / member ID); voter verifies (OTP) → gets a single-use ballot token → ballot stored **without any link to the voter**; turnout tracked from tokens; results only after close; observer/audit export.
- **Ticketing:** ticket types (name, price, quantity, sales window), QR ticket per purchase, check-in by scanning, optional votes bundled with a ticket.

### Events without categories (decided 22 Nov 2026)
An event does not need categories. Some events are one list (e.g. "Most Popular Student", a single pageant line-up, one poll).
- Every event has one hidden default category. While it is the only one, voters go straight from the event page to the contestant list, and the dashboard hides the Categories screen.
- The organiser can add categories later. Existing contestants and their votes move into the first category, unchanged.
- Price, rules and results work the same; they use the event settings.

### Voting rules (event default, overridable per category)

| Rule | Options | Applies to |
|---|---|---|
| Access | Anyone · Phone OTP · Account login · Invite/ticket codes · Private link · Voter register | All (register = elections only) |
| Cost | Free · Paid (price per vote) | Paid voting, polls (free only) |
| Quantity | Min/max votes per transaction, quick picks (1, 5, 10, 50), custom amount | Paid voting |
| Frequency | Max votes per phone / email / device / payment account, per hour / day / event | Paid voting, polls |
| One person, one vote | Fixed on | Elections |
| Window | Opens at, closes at, manual pause | All |
| Entry modes | By code · Browse list · Direct contestant link · USSD | All (USSD off for elections by default) |
| Results | Live counts · Percentages only · Hidden until close · Top N | Elections: hidden until close only |
| Scoring | Public only · Judges only · Judges % + Public % | Paid voting, polls |
| Channels | Web · Embed · USSD (each on/off) | All |
| Lock | Rules lock when voting opens; any later change needs a reason and is logged and shown in the audit | All |

### Vote price per category (decided 22 Nov 2026)

- Each event has one default price per vote, set in step 6 of the create wizard. The wizard stays simple: it shows the number ("Every category costs GH₵ 1.00 a vote") and says the price can change per category later.
- Organisers can set a different price on any category (O6). Rounds can set a price too, for example finals cost more than heats.
- Which price wins: category, then round, then event default.
- Voters always see the price where they decide and pay: category screen, vote screen ("GH₵ 2.00 a vote") and receipt.
- A change after voting opens applies to new votes only. It needs a reason, and it is logged in Activity and the audit (see Lock).
- Rankings count votes, never money. Reports show revenue per category.
- Prices are stored in minor units with the event currency code. Elections have no price.

---

## 4. Voter flows (public, mobile-first, same screens in the embed)

### Flow A — Vote by code (primary)

| # | Screen | Shows | Primary action |
|---|---|---|---|
| A1 | Category | Event logo, category name, price, one code field (variable length) | Find · quiet: "Browse contestants" |
| A2 | Contestant | Photo (4:5), name, category, code; quick picks 1/5/10/50 + Custom (paid only) | Vote · GH₵ X (free: Vote) |
| A3 | Pay | Order summary (photo, name, votes, amount) + choose **Mobile money** or **Card** | Pay GH₵ X → redirect to Paystack checkout for the chosen method |
| A4 | Confirming | Shown when the voter returns from Paystack: "Confirming your payment", polls until the verified webhook | none (waits) · quiet: "Check again" |
| A5 | Done | ✓, votes added, receipt (ref, amount, method, date) | Vote again for <contestant> (same person, back to A2) · quiet: "All categories" (→ event page) · "Results" (only if the event shows results) |

States to design: wrong code (inline on A1), voting not started / closed / paused (A1), custom amount below min / above max (A2), limit reached (A2), payment declined / timed out / insufficient funds (A4 → retry), network error, OTP needed (A2b), payment pending (late MoMo approval).

- A2b OTP (only if required): phone → 6-digit code → returns to A2 action.
- **Paystack hosted checkout:** Votex initializes the transaction with `channels: ["mobile_money"]` or `["card"]` (from the voter's choice), redirects to Paystack's `authorization_url`, and Paystack returns to our callback. MoMo prompts, PINs and card 3-D Secure all happen on Paystack's page, not ours.
- Free + no verification: A2 → A5 directly.

### Flow B — Browse
Event page (categories) → Category page (contestant grid + search by name/code) → A2 → A3…A5.

**Categories at scale.** An event can have ~100 categories, so the category list must stay usable:
- Search field for categories (matches name; results update as you type; clear button; "no match" state).
- Optional organiser-defined **category groups** (e.g. Music, Gospel, Media, Industry) shown as section headers in the list.
- On scroll, only the **event header** and the **search field** stay pinned at the top; everything else scrolls.
- "Results" entry in the event header, shown only when the event allows public results.
- Same list on tablet/desktop lives in a left pane next to the selected category's contestants.

### Flow C — Direct contestant link / QR
Link or QR per contestant → starts at A2.

### Flow D — USSD (no internet)
Dial the event's USSD code (built from settings, never hardcoded):
1. "Enter contestant code" → 2. "Vote for Ama Serwaa (AMA07)? Enter number of votes" → 3. "Total GH₵ 5.00. 1. Pay 2. Cancel" → MoMo prompt → SMS receipt.

**How event USSD codes are made (decided 22 Nov 2026).**
- The platform owner sets a base code in platform settings, e.g. `*800#`. The base can already have an extension, e.g. `*800*4#`.
- Each event gets a number. The event code is the base without the final `#`, then `*`, the number and `#`: base `*800#` + event 4 = `*800*4#`; base `*800*4#` + event 4 = `*800*4*4#`.
- The platform owner can give an event its own dedicated shortcode instead (e.g. a code the organiser bought). The dedicated code wins over the base code.
- Changing the base code updates every event's code at once. The old code keeps working for a grace period with a "this code has changed" message.
- Event numbers are unique among live events. A number is reused only 30 days after its event ends, so old posters do not reach the wrong event.
- Shortcut: voters can add the contestant code, e.g. `*800*4*017#`, and skip step 1.
- Shown everywhere from one source: Share & embed, posters, receipts, event page.

**USSD votes land in the same system (decided 22 Nov 2026).** USSD is another way in, not a separate system.
- The USSD provider sends each menu step to our server. We run the menu, check the event and contestant codes, and work out the price from the same settings as the web.
- Payment goes through a payment adapter, not a fixed provider. Two options, chosen by the platform owner per country (and overridable per event):
  - the USSD provider's own built-in payment, when it has one, or
  - Paystack's mobile money charge from our server.
  Either way the voter gets the MoMo prompt on the same phone.
- Any provider we plug in must: start a charge with our reference, send a signed confirmation to our webhook, let us check a payment's status by reference, and report fees and settlement. We do not add a provider that cannot do all four.
- Votes are credited only after a verified confirmation from that provider (signature checked, then status checked by reference) — the same rule as web votes. If a confirmation is late, we check the status ourselves. Unpaid or timed-out sessions never count. Each reference is credited once.
- Each payment records which provider took it. Finance reconciles each provider's settlement report against our ledger daily, and the organiser's balance and fees follow that provider's actual charges.
- Every vote is stored in one ledger with its channel (web, embed, USSD, ticket, offline). Live results, the TV screen, transactions, receipts, payouts, fraud checks and the audit report all read from that ledger.
- Dashboards can show votes and money split by channel.

Deliverable: USSD menu tree (all screens ≤ 160 chars, every error path) + SMS receipt copy. Menus must fit short USSD session timeouts.

### Flow E — Nominate
Event nominations page → pick category → nominee details (name, phone/email, photo optional, reason ≤ 200 chars) → own contact (OTP if required) → pay fee (if any) → Done (reference). States: nominations closed, duplicate nominee, fee failed.

**Nomination form builder (organiser).** The form is not fixed: the organiser builds it per event, and can override it per category. Field types: short text, long text, number, date, choice list, photo upload, file upload, phone, email, link. Each field has a label, optional help text, required/optional, and (for choice lists) options. Who can nominate is set too: anyone (phone or email check), a member list (ID check), or self-nomination only. Examples designed in Figma "B6b": pageant (name, region, age, photo), business awards (business, location, reason), campus awards (student, programme, social handle, student ID). The voter screen layout stays the same; only the fields change.

### Flow F — Election ballot
Verify (member ID / phone / email + OTP against register) → ballot, one category per screen (one choice, or "skip" if allowed) → review all choices → Submit → receipt with ballot reference that **does not reveal choices**. States: not on register, already voted, election not open / closed, token expired.

### Flow G — Buy ticket + check-in
Event page → ticket type + quantity → pay (same MoMo/card rails) → QR ticket (screen + SMS/email link). Check-in: organiser scanner screen (camera) → valid / already used / wrong event / refunded. Bundled votes credited on purchase if configured.

### Judge scoring
Judges have their own portal, separate from the dashboard. Judge signs in (email OTP) → home with assigned categories and progress → contestant list with search by name or code and filters (Not scored / Scored); on tablet the list and scoring sit side by side → per entry: photo, name, criteria sliders/number fields with weights → Save → Submit all (locks scores). Works on a tablet at the venue.

### Contestant portal
**Access (decided 22 Nov 2026).** The organiser adds each contestant's email when adding them (O7). We email an invite with a one-tap sign-in button (valid 24 hours). After that, contestants sign in at `vote.eventpeepo.com/me` with an email code, no password. If a contestant is in several categories or events, they pick which page to open. Their page is a full page, not a card: big photo, name, category and code, votes (if allowed), share buttons, link, USSD shortcut, and 9:16 share cards. Designed in Figma "O17b".

Contestant signs in (phone OTP) → personal link + QR → share cards for WhatsApp status / Instagram (auto-generated) → own vote count (only if organiser allows).

### Results page & live screen
- Public results page only if the event allows it; respects "percentages only / top N / hidden". Ranked horizontal bars in one colour, each labelled with its share; tooltips with exact votes on hover; table view for screen readers.
- **Live results screen (TV/LED):** 16:9 full-screen leaderboard with photos, bars, QR "scan to vote" and total votes; auto-updates; safe for broadcast (large type, high contrast). Election results shown only after close. **Theme: light or dark, chosen by the organiser per screen** (light for bright halls and daytime, dark for stage and LED walls). Shows 4 places per page; when more places are public, pages rotate every 10 seconds (1–4, 5–8, …) with a "1–4 of 8" marker, and the leader stays on the left. Mobile results open with a top-3 row above the full list.

---

## 5. Payments & money flow

### Split payments and settlement (decided 22 Nov 2026)
- Each verified organiser gets a Paystack **subaccount** (created when they add their payout account in onboarding).
- Every charge carries the organiser's subaccount and the Votex fee, so Paystack **splits the money at checkout**: the organiser's share settles straight to their bank or MoMo account on Paystack's schedule (next working day); the Votex fee settles to Votex. Votex never holds organiser money from Paystack, so there is **no manual withdraw** for it.
- The Paystack fee is paid from the organiser's share (Paystack `bearer` = subaccount).
- The Votex fee is a percentage of each payment, set by the platform owner in platform settings (stored as a number, never hardcoded). It is applied as the split on every charge.
- Finance shows: paid to you, on the way, how each payment was split, settlements from Paystack (matched daily to our ledger), and the settlement account.
- Changing the settlement account (updates the Paystack subaccount): code to the owner's phone, a second admin approves, the new account starts after 24 hours, and the whole team is emailed.
- Everyone settles next working day (Paystack's standard schedule). No slower schedules.
- Refunds and chargebacks: because the organiser's share has already settled, a refund is recovered from the organiser's next settlements; the dashboard shows it as a deduction with the payment reference.
- Money taken by a provider that cannot split (e.g. a USSD gateway with its own payments) lands with Votex and shows as "Paid by Votex", paid out on a fixed schedule. This is the only case with a Votex payout.
- To confirm at build time: Paystack subaccount settlement to mobile money in Ghana, and refund handling for split transactions.

### Email first; SMS is a paid add-on per client (decided 22 Nov 2026)
- **Default for every client (organiser account): email only.** All one-time codes and notifications go by email.
- **SMS add-on is a toggle per client, set by the platform owner** (Platform admin → Clients → SMS). When a client pays for SMS, the platform owner switches it on for that client; it then applies to all their events.
- **When SMS is on, messages go by email AND SMS:**
  - every one-time code (organiser and team sign-in, judges, contestants, voters, election voters, approvals) goes to both email and phone;
  - every one-to-one notification (invites, ticket and organiser receipts, approval requests, settlement alerts, fraud flags to the owner) goes to both.
  - **Exception: voter payment receipts never go by SMS.** They stay on screen and by email (if given); the MoMo network already sends its own payment SMS.
- **Bulk sends always go by email only, even with SMS on.** A send is bulk when one action messages many people at once — e.g. "Text all contestants", register-wide turnout reminders, nomination-round announcements, reports and digests. Rule: any single send to more than a set number of people (platform setting, default 50) routes to email only. One-to-one messages triggered per person are never treated as bulk.
- The platform owner sets the SMS price per client (flat fee, bundle or per SMS) and sees SMS sent and cost per client. The client sees "SMS: on" and their usage in settings; they cannot turn it on themselves.
- Without SMS: voters still get the MoMo prompt and the network's payment SMS; our receipt shows on screen and by email if given. USSD voters see the result on the USSD screen.
- Copy rule: screens say "by email" by default; with SMS on, "by email and SMS".

### Currency (never hardcoded)
- Every amount is stored as an **integer in minor units plus an ISO 4217 currency code** (e.g. `500, "GHS"`). No currency symbol, decimal rule or "GH₵" string is hardcoded anywhere in code, copy or templates.
- **Event currency** is set per event (tenant default first) and locked once voting/ticket sales open. Prices, totals, receipts, payouts and fees use it.
- Formatting uses the locale-aware number formatter (`Intl.NumberFormat` with the currency code and the viewer's locale), so ₵, ₦, KSh, R, CFA, $, € etc. all render correctly.
- **Voter display conversion (optional per event):** show an approximate amount in the voter's currency next to the real one ("≈ ₦ 1,240"). The charge is always in the event currency; the FX rate, its source and timestamp are saved on the order.
- Payment rails, fees and payout methods are configured **per country/currency**; Ghana (GHS via Paystack/Hubtel) is the first market, others are added by configuration, not code changes.
- Platform fee is defined per currency (percentage and/or fixed in minor units).

- **Rails:** Paystack (Ghana) **hosted checkout** — the voter picks Mobile money or Card on Votex, then pays on Paystack's page (MTN MoMo, Telecel Cash, AirtelTigo Money, cards); amounts in GHS. Votes/tickets credited **only after a verified `charge.success` webhook**.
- **USSD:** Hubtel (USSD + its MoMo collection), or another licensed aggregator (Nalo, Hellio) on better terms.
- **Custody (recommended):** Paystack **split payments / subaccounts** — each tenant's share settles to the tenant, the platform fee is taken automatically. Avoid Event Peepo holding tenant money. **Legal check required** on Bank of Ghana licensing (Payment Systems and Services Act, 2019, Act 987) before choosing any custodial model.
- **Fee pass-through:** organiser chooses per event — voter pays a convenience fee, or organiser absorbs it.
- **Pricing model:** percentage of vote/ticket revenue, no upfront cost (default); optional setup fee for custom domain, white-label, on-site support. Free polls and elections: flat fee per event or per voter (to confirm).
- **Payout safety:** organiser KYC/verification before first payout; payout hold until a set number of days after close (dispute window); refunds from dashboard.
- **Engineering:** idempotent order IDs, webhook signature checks, webhooks processed through a queue, reconciliation job for pending/late payments, tenant payouts to MoMo/bank.

---

## 6. Results integrity (the main selling point)

- **Append-only vote ledger** — nothing is edited; corrections are reversal entries with a reason and actor.
- **Public receipt lookup** — voters check a vote by reference or phone number (also cuts "I paid but no vote" support).
- **Offline/cash votes** — entered as a separate, clearly labelled channel (who, when, amount, evidence); always shown separately in exports and optionally on results.
- **Rules lock at open** — later changes need a reason, are logged and visible in the audit.
- **Tally export** — signed CSV/PDF for sponsors, TV partners and auditors; elections add an observer export (turnout, ballots count, no voter-ballot link).
- **Fraud flags** — velocity per phone/card/device, card testing, chargebacks, unusual offline entries.

---

## 7. Show-night load

- Expect most votes in the last 30–60 minutes and spikes right after a shortcode is shown on TV.
- Webhooks → queue → idempotent crediting; never double-credit.
- Live counts from aggregate counters (per entry), not row counts; Realtime pushes aggregates.
- Pending-payment reconciliation for MoMo prompts that approve late.
- Per-tenant rate limits so one event can't slow others.
- Load test before the first big event; status page and on-call during live events.

---

## 8. Organiser dashboard (tenant)

Adaptive; designed at 1280 first, then redesigned (not shrunk) for tablet and mobile. One primary action per screen.

| # | Screen | Primary action |
|---|---|---|
| O1 | Sign up / sign in (email OTP), onboarding: org name → logo & accent → payout account → verification (KYC) | Continue |
| O2 | Events (home) | New event |
| O3 | Create event — one step per screen: Type → Basics → Look → Rounds → Rules → Price → Review. Save a draft at any step. Review saves the event; publish unlocks once one category has a contestant | Continue / Save and add categories |
| O4 | Event overview: votes, revenue, live leaderboard, status | Open / Pause voting |
| O5 | Rounds / stages (window, carry-over, reset) | Add round |
| O6 | Categories (list + per-category rule and price overrides) | Add category |
| O7 | Contestants (list, photo, code; CSV import; assign to categories) | Add contestant |
| O8 | Nominations review (shortlist, reject, merge duplicates) and the nomination form builder (10 field types, live preview, who can nominate) | Shortlist / Save form |
| O9 | Judges & criteria (invite judges, criteria + weights, score progress, release) | Invite judge |
| O10 | Election voter register (import CSV, eligibility, turnout). Election events rename the menu: Positions, Candidates, Voter register, Results, Ballot | Import register |
| O11 | Ticketing & check-in (ticket types, sales, scanner, attendees) | Add ticket type |
| O12 | Voting rules (table in §3) | Save |
| O13 | Offline votes entry (permissioned, evidence required) | Add entry |
| O14 | Transactions (filter, refund, export CSV) | Export |
| O15 | Finance: paid to you, on the way, split per payment, settlements from Paystack, settlement account (no manual withdraw for Paystack money) | Change account |
| O16 | Share & embed: links, QR per contestant/category, USSD code, embed snippet, WordPress, live screen link | Copy |
| O17 | Contestant portal settings (share cards, own-count visibility) | Save |
| O18 | Team & roles | Invite |
| O19 | Activity & fraud flags (audit log) | Review |

### Platform admin (Event Peepo staff)
Tenants & verification (KYC), fee settings, disputes/refunds, payouts approval/holds, fraud review, system health, status page, USSD codes (base code, event numbers, dedicated codes).

**Sub-admins with tailored permissions (decided 22 Nov 2026).** The platform owner invites staff and gives each one a role. Roles are built from permissions, each set to None, View or Manage:
organisers & verification · events · payouts · refunds & disputes · fees & pricing · fraud review · USSD & SMS · support (act as organiser, read only) · platform settings · staff & roles.
- Ready-made roles to start from: Support, Finance, Compliance, Operations. The owner can copy and change them.
- Optional scope: limit a sub-admin to one country or a list of organisers.
- Sensitive actions need a second person: payouts above a set amount, fee changes, refunds above a set amount.
- Every staff action is logged. Two-step sign-in is required for all staff.
- Only the owner can manage owners and the staff & roles permission.

---

## 9. Contestant growth tools

Contestants campaigning on WhatsApp/Instagram drive vote volume:
- Personal link + QR per contestant.
- Auto-generated share cards (photo, name, code, "vote" QR) sized for WhatsApp status and Instagram story/post.
- Own vote count view (organiser setting).

---

## 10. Embed & WordPress plugin

- **Embed:** iframe served from `vote.eventpeepo.com/embed/{event}/{category}` + a tiny loader script (`votex.js`) that auto-resizes it via postMessage. Iframe keeps payments isolated from the host page.
- **Theming:** event accent, light/dark/auto, radius (sharp/soft), optional font inherit (family name passed via the loader). Neutral defaults so it looks native on most sites.
- **WordPress:** plugin with shortcode `[votex event="…" category="…"]` and a Gutenberg block wrapping the same embed. Other stacks use the script snippet.
- **Design deliverables:** embed at 320 / 480 / 720 widths on a light and a dark host page; dashboard "Share & embed" screen.

---

## 11. Multi-tenancy, legal & operations

- Row-level isolation by `tenant_id`; tenant subdomain (`{tenant}.vote.eventpeepo.com`) and optional custom domain; per-tenant branding, payment config, rate limits; data export and retention policy after events.
- **Legal:** register with the Data Protection Commission (Data Protection Act, 2012, Act 843); voter and organiser terms; privacy notice; contestant photo consent; **guardian consent for under-18 contestants**; legal check that paid voting (no prize to the voter) is not treated as gaming.
- **Support:** WhatsApp support during live events; self-serve receipt lookup; SMS receipts.

---

## 12. Go-to-market

- **Segments:** pageant organisers, award schemes, TV and radio stations, campus SRCs and associations (elections), churches.
- **Selling points:** trust in results (§6), fast setup (event live in ~15 minutes from a phone), contestant share tools, live TV screen, fast payouts.
- **Channels:** reseller/agent programme (event promoters earn a share), one strong case study from a well-known event, WhatsApp live-event support.

---

## 13. Tech stack (build phase)

- Next.js (App Router) + TypeScript + Tailwind CSS; component primitives from Radix/shadcn, fully restyled with Votex tokens (must not look like default shadcn).
- Supabase: Postgres with row-level security by `tenant_id`, Auth (email/phone OTP), Realtime for live counts, Storage for photos.
- Payments: Paystack (MoMo + card, split payments/subaccounts), Hubtel (USSD).
- Queue for webhooks/crediting (Supabase queues / pgmq or equivalent).
- Hosting: Vercel (or similar) on vote.eventpeepo.com; webhooks and USSD callbacks as server routes / edge functions.
- Tests: Playwright for voter flows (mobile viewport), unit tests for rule engine, payment crediting and ballot anonymity; load test before first live event.

**Core tables:** tenants, tenant_members, events, stages, categories, contestants, category_entries, voting_rules, voters, vote_orders, payments, votes (append-only ledger), offline_vote_entries, nominations, judges, judging_criteria, scores, voter_register, ballot_tokens, ballots (no voter link), ticket_types, tickets, checkins, ussd_sessions, payouts, audit_log.

---

## 14. Phases & approval gates

Each phase ends with client sign-off **in Figma**. No build work starts on any screen until it is confirmed.

| Phase | Output | Gate |
|---|---|---|
| 0. Setup | Repo, Figma connected, AGENTS.md (working rules) | ✅ Done |
| 1. Direction | 3 directions (A1 + A2 + A5) side by side → chosen: B layout + A palette; refined screens | ✅ Approved 21 Nov 2026 (A5 exits + event page added) |
| 2. Foundations | Tokens (code + Figma variables), type, spacing, 15–20 core components (button, input, code input, quick picks + custom, contestant card, sheet, toast, table, nav…) | ✅ Approved 22 Nov 2026: vx tokens (colour light/dark, space, radius), 13 Familjen text styles, 20 components on the Figma "Components" page |
| 3. Voter flows (B1–B8 incl. nominations, ballot, tickets ✅ approved 22 Nov 2026) | Flows A–G, all states, judge scoring, contestant portal, results page + live TV/LED screen — each at mobile 390, tablet 768/1024, desktop 1280 and embed widths; USSD tree | Approve |
| 4. Dashboard | O1–O19 incl. rounds, nominations, judges, voter register, ticketing/check-in, offline votes; desktop 1280, tablet 1024/768 and mobile 390, each redesigned for the device | Batch 1 (O2 Events home, O4 Event overview; new Nav item, Stat tile, Tab bar) ✅ approved 22 Nov 2026. Batch 2 (O1 sign in and onboarding, O3 create an event) ✅ approved 22 Nov 2026. Batch 3 (O6 categories with own price, O7 contestants and CSV import, O8 nomination review, merge and form builder) ✅ approved 22 Nov 2026. Batch 4 (O9 judges and scoring, O9b judge portal, O10 voter register, O11 tickets and check-in) ✅ approved 22 Nov 2026. Batch 5 (O12 voting rules, O13 offline votes, O14 transactions, O15 finance with Paystack split settlement) ✅ approved 22 Nov 2026. Batch 6 (O16–O19, plus O17b contestant sign-in and full contestant page) ✅ approved 22 Nov 2026. Fee amounts in designs are examples until pricing is set |
| 5. Admin & edge cases | Platform admin (incl. staff roles and permissions, USSD code settings), empty/error states, emails/SMS, judge portal (sign in, home, search list, submit) | Approve → build — in progress on Figma page "Screens / Platform Admin": P1 Clients, P2 Client page (SMS add-on, Votex fee) ✅ approved; P3 Verification, P4 Platform settings, P5 Staff and roles ✅ approved; P6 Payments and disputes, P7 Fraud review, P8 Overview ✅ approved. Edge states (voter and organiser) and Messages (4 emails, SMS add-on examples and rules) in review on Figma page "Screens / States and Messages" |
| 6. Build | DB + RLS, auth, voter flows, payments (sandbox), USSD, elections, judging, ticketing, dashboard, embed + WP plugin, load test, deploy | UAT |

---

## 15. Figma

File: https://www.figma.com/design/T5E4ufcU3nSuqgyPJfKchN

| Page | Contents |
|---|---|
| Cover | — |
| Phase 1 · Directions | Directions A (Quiet), B (Photo-led), C (Stage): A1, A2, A5 each |
| Components | Phase 2 |
| Screens / Web App · Embed Widget · Admin Dashboard | Phases 3–5 |
| Archive | v1 pages: "Archive / v1 Color (superseded)", "Archive / v1 Type & Spacing (superseded)" |

v1 "Primitives" and "Color" variable collections are still in the file; they are replaced in Phase 2.

---

## 16. Open questions for the client

1. Contestant code: unique per event (assumed) or per category?
2. Can one contestant be in several categories?
3. Platform fee: percentage, fixed, or both? Default fee pass-through (voter or organiser)? Pricing for elections and free polls?
4. USSD shortcode: shared Event Peepo code or per-tenant?
5. Organiser verification (KYC) required before payouts — which documents, and how long is the payout hold?
6. Languages beyond English?
7. Elections: anonymity level (fully secret vs auditable by observers)? Who can see turnout during voting?
8. Judges: default weighting (e.g. 60% judges / 40% public)? Can judges see public counts?
9. Ticketing: same Paystack rails and fee model as votes? Refund policy?
10. Offline/cash votes: which roles may enter them, and is evidence (photo/receipt) mandatory?
11. Custom domains: how many tenants will want them (affects pricing tier)?
