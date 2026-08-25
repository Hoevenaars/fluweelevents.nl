-- Fluweel Events · volledig CRM-schema
-- Voer uit in Supabase SQL Editor (EU-regio aanbevolen)

create extension if not exists pgcrypto;

-- ===== LEADS (contactformulieren) =====
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  email text not null,
  telefoon text,
  bedrijf text,
  bericht text not null,
  bron text not null default 'website',
  status text not null default 'nieuw',
  notities text default '',
  toegewezen_aan text,
  gelezen boolean not null default false,
  ontvangen_op timestamptz not null default now()
);

alter table public.contact_submissions
  add column if not exists bedrijf text,
  add column if not exists bron text,
  add column if not exists status text,
  add column if not exists notities text,
  add column if not exists toegewezen_aan text,
  add column if not exists gelezen boolean,
  add column if not exists ontvangen_op timestamptz;

update public.contact_submissions set bron = coalesce(bron, 'website') where bron is null;
update public.contact_submissions set status = coalesce(status, 'nieuw') where status is null;
update public.contact_submissions set notities = coalesce(notities, '') where notities is null;
update public.contact_submissions set gelezen = coalesce(gelezen, false) where gelezen is null;
update public.contact_submissions set ontvangen_op = coalesce(ontvangen_op, now()) where ontvangen_op is null;

alter table public.contact_submissions alter column bron set default 'website';
alter table public.contact_submissions alter column status set default 'nieuw';
alter table public.contact_submissions alter column notities set default '';
alter table public.contact_submissions alter column gelezen set default false;
alter table public.contact_submissions alter column ontvangen_op set default now();

alter table public.contact_submissions drop constraint if exists contact_submissions_status_check;
alter table public.contact_submissions
  add constraint contact_submissions_status_check
  check (status in ('nieuw', 'contact', 'offerte', 'gewonnen', 'verloren'));

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
  status text not null default 'concept',
  geldig_tot date,
  subtotaal numeric(10,2) not null default 0,
  btw_pct numeric(5,2) not null default 21,
  btw_bedrag numeric(10,2) not null default 0,
  totaal numeric(10,2) not null default 0,
  notities text default '',
  portal_token text unique default encode(gen_random_bytes(16), 'hex'),
  aangemaakt_op timestamptz not null default now()
);

alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('concept', 'verstuurd', 'geaccepteerd', 'afgewezen'));

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
  status text not null default 'concept',
  vervaldatum date,
  subtotaal numeric(10,2) not null default 0,
  btw_pct numeric(5,2) not null default 21,
  btw_bedrag numeric(10,2) not null default 0,
  totaal numeric(10,2) not null default 0,
  notities text default '',
  aangemaakt_op timestamptz not null default now()
);

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('concept', 'verstuurd', 'betaald', 'vervallen'));

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
  status text not null default 'planning',
  draaiboek text default '',
  moodboard_urls text[] default '{}',
  aangemaakt_op timestamptz not null default now()
);

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('planning', 'voorbereiding', 'live', 'afgerond'));

alter table public.tasks drop constraint if exists tasks_project_id_fkey;
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
  status text not null default 'concept',
  verzonden_op timestamptz,
  aangemaakt_op timestamptz not null default now()
);

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('concept', 'verzonden'));

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
-- De app gebruikt de service role key en bypassed RLS.
-- Policies laten authenticated users (admin-login) later veilig client-side werken.
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

drop policy if exists "admin_all_contact_submissions" on public.contact_submissions;
create policy "admin_all_contact_submissions" on public.contact_submissions
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_activities" on public.activities;
create policy "admin_all_activities" on public.activities
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_tasks" on public.tasks;
create policy "admin_all_tasks" on public.tasks
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_email_templates" on public.email_templates;
create policy "admin_all_email_templates" on public.email_templates
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_quotes" on public.quotes;
create policy "admin_all_quotes" on public.quotes
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_quote_lines" on public.quote_lines;
create policy "admin_all_quote_lines" on public.quote_lines
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_invoices" on public.invoices;
create policy "admin_all_invoices" on public.invoices
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_invoice_lines" on public.invoice_lines;
create policy "admin_all_invoice_lines" on public.invoice_lines
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_projects" on public.projects;
create policy "admin_all_projects" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_campaigns" on public.campaigns;
create policy "admin_all_campaigns" on public.campaigns
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_campaign_sends" on public.campaign_sends;
create policy "admin_all_campaign_sends" on public.campaign_sends
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_website_sections" on public.website_sections;
create policy "admin_all_website_sections" on public.website_sections
  for all to authenticated using (true) with check (true);

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
