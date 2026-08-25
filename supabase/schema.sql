-- Fluweel Events · volledig CRM-schema
-- Voer uit in Supabase SQL Editor (EU-regio aanbevolen)

-- ===== LEADS (contactformulieren) =====
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  email text not null,
  telefoon text,
  bedrijf text,
  bericht text not null,
  bron text not null default 'website',
  status text not null default 'nieuw'
    check (status in ('nieuw', 'contact', 'offerte', 'gewonnen', 'verloren')),
  notities text default '',
  toegewezen_aan text,
  gelezen boolean not null default false,
  ontvangen_op timestamptz not null default now()
);

-- ===== ACTIVITEITEN (timeline) =====
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.contact_submissions(id) on delete cascade,
  type text not null default 'notitie',
  titel text not null,
  omschrijving text default '',
  door text,
  aangemaakt_op timestamptz not null default now()
);

-- ===== TAKEN =====
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.contact_submissions(id) on delete set null,
  project_id uuid,
  titel text not null,
  omschrijving text default '',
  deadline date,
  voltooid boolean not null default false,
  toegewezen_aan text,
  aangemaakt_op timestamptz not null default now()
);

-- ===== E-MAIL TEMPLATES =====
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  naam text not null,
  onderwerp text not null,
  inhoud text not null,
  aangemaakt_op timestamptz not null default now()
);

-- ===== OFFERTES =====
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.contact_submissions(id) on delete set null,
  nummer text unique not null,
  klant_naam text not null,
  klant_email text not null,
  klant_bedrijf text,
  status text not null default 'concept'
    check (status in ('concept', 'verstuurd', 'geaccepteerd', 'afgewezen')),
  geldig_tot date,
  subtotaal numeric(10,2) not null default 0,
  btw_pct numeric(5,2) not null default 21,
  btw_bedrag numeric(10,2) not null default 0,
  totaal numeric(10,2) not null default 0,
  notities text default '',
  portal_token text unique default encode(gen_random_bytes(16), 'hex'),
  aangemaakt_op timestamptz not null default now()
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  omschrijving text not null,
  aantal numeric(10,2) not null default 1,
  prijs numeric(10,2) not null default 0,
  sort_order int not null default 0
);

-- ===== FACTUREN =====
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete set null,
  lead_id uuid references public.contact_submissions(id) on delete set null,
  nummer text unique not null,
  klant_naam text not null,
  klant_email text not null,
  klant_bedrijf text,
  status text not null default 'concept'
    check (status in ('concept', 'verstuurd', 'betaald', 'vervallen')),
  vervaldatum date,
  subtotaal numeric(10,2) not null default 0,
  btw_pct numeric(5,2) not null default 21,
  btw_bedrag numeric(10,2) not null default 0,
  totaal numeric(10,2) not null default 0,
  notities text default '',
  aangemaakt_op timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  omschrijving text not null,
  aantal numeric(10,2) not null default 1,
  prijs numeric(10,2) not null default 0,
  sort_order int not null default 0
);

-- ===== PROJECTEN (events) =====
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.contact_submissions(id) on delete set null,
  naam text not null,
  klant_naam text not null,
  klant_email text,
  event_datum date,
  locatie text,
  aantal_gasten int,
  budget numeric(10,2),
  status text not null default 'planning'
    check (status in ('planning', 'voorbereiding', 'live', 'afgerond')),
  draaiboek text default '',
  moodboard_urls text[] default '{}',
  aangemaakt_op timestamptz not null default now()
);

alter table public.tasks
  drop constraint if exists tasks_project_id_fkey;
alter table public.tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

-- ===== CAMPAGNES =====
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  onderwerp text not null,
  inhoud text not null,
  filter_status text,
  filter_dagen_oud int,
  status text not null default 'concept'
    check (status in ('concept', 'verzonden')),
  verzonden_op timestamptz,
  aangemaakt_op timestamptz not null default now()
);

create table if not exists public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid references public.contact_submissions(id) on delete set null,
  email text not null,
  verzonden_op timestamptz not null default now()
);

-- ===== WEBSITE CMS =====
create table if not exists public.website_sections (
  sleutel text primary key,
  waarde text not null default '',
  bijgewerkt_op timestamptz not null default now()
);

-- ===== INDEXEN =====
create index if not exists idx_leads_status on public.contact_submissions(status);
create index if not exists idx_leads_ontvangen on public.contact_submissions(ontvangen_op desc);
create index if not exists idx_tasks_deadline on public.tasks(deadline);
create index if not exists idx_activities_lead on public.activities(lead_id);

-- ===== RLS =====
alter table public.contact_submissions enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.email_templates enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.projects enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;
alter table public.website_sections enable row level security;

-- Authenticated admins: volledige toegang
-- (App gebruikt service role en bypassed RLS; policies zijn voor toekomstige client-side access.)
do $$
declare
  t text;
begin
  foreach t in array array[
    'contact_submissions','activities','tasks','email_templates',
    'quotes','quote_lines','invoices','invoice_lines',
    'projects','campaigns','campaign_sends','website_sections'
  ]
  loop
    begin
      execute format(
        'create policy "admin_all_%s" on public.%I for all to authenticated using (true) with check (true)',
        t, t
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- Standaard e-mailtemplates
insert into public.email_templates (slug, naam, onderwerp, inhoud) values
  ('bevestiging', 'Bevestiging ontvangst', 'Bedankt voor je aanvraag · Fluweel Events',
   E'Beste {{naam}},\n\nBedankt voor je bericht. We hebben je aanvraag ontvangen en nemen snel contact met je op.\n\nHartelijke groet,\nFluweel Events'),
  ('followup', 'Follow-up gesprek', 'Vervolg op ons gesprek · Fluweel Events',
   E'Beste {{naam}},\n\nLeuk dat we hebben gesproken. Heb je nog vragen? We denken graag met je mee.\n\nHartelijke groet,\nFluweel Events'),
  ('offerte', 'Offerte begeleiding', 'Je offerte van Fluweel Events',
   E'Beste {{naam}},\n\nHierbij ontvang je onze offerte. Laat gerust weten als je vragen hebt.\n\nHartelijke groet,\nFluweel Events')
on conflict (slug) do nothing;

-- Standaard website-secties
insert into public.website_sections (sleutel, waarde) values
  ('hero_titel', 'Meer dan een evenement. Een herinnering.'),
  ('hero_intro', 'Wij ontwerpen zakelijke belevenissen die gasten raken en merken versterken.'),
  ('contact_titel', 'Klaar voor een avond die blijft hangen?')
on conflict (sleutel) do nothing;
