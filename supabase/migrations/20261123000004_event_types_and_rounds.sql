-- Create-event wizard per event type and rounds in full (Figma "O3 · By event type", "O5 · Rounds",
-- approved 23 Nov 2026).

alter table public.events
  -- Tickets only: where the event happens, printed on every ticket.
  add column venue text check (char_length(venue) <= 120),
  -- Elections: how voters prove they are on the list; whether a position can be left blank.
  add column voter_sign_in text not null default 'member_id_email'
    check (voter_sign_in in ('member_id_email', 'member_id_phone', 'email', 'phone')),
  add column allow_blank_choice boolean not null default false,
  -- Nominations: who can nominate, the optional fee, and self-nomination.
  add column nominators text not null default 'anyone_code' check (nominators in ('anyone_code', 'invited')),
  add column nomination_fee_minor bigint check (nomination_fee_minor > 0),
  add column allow_self_nomination boolean not null default true;

grant update (venue, voter_sign_in, allow_blank_choice, nominators, nomination_fee_minor, allow_self_nomination)
  on public.events to authenticated;

-- Who moves on into a round from the one before it: everyone, the top N, or the organiser's pick.
alter table public.rounds
  add column advance_mode text not null default 'all' check (advance_mode in ('all', 'top', 'pick')),
  add column advance_count smallint check (advance_count between 1 and 1000),
  add constraint rounds_advance_count check (advance_mode <> 'top' or advance_count is not null),
  -- A judges round has no price (approved O5 rule).
  add constraint rounds_judges_no_price check (mode <> 'judges' or price_minor is null);

grant update (advance_mode, advance_count) on public.rounds to authenticated;
