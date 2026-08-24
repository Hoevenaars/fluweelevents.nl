-- Migratie: voeg procesfases en notities toe aan bestaande tabellen
-- Voer dit uit als contact_submissions al bestaat

alter table public.contact_submissions
  add column if not exists status text not null default 'nieuw',
  add column if not exists notities text;

alter table public.contact_submissions
  drop constraint if exists contact_submissions_status_check;

alter table public.contact_submissions
  add constraint contact_submissions_status_check
  check (status in ('nieuw', 'contact', 'offerte', 'gewonnen', 'verloren'));

create index if not exists contact_submissions_status_idx
  on public.contact_submissions (status);

-- Bestaande rijen zonder status krijgen 'nieuw' (default).
-- Ongelezen rijen in fase 'nieuw' houden.
