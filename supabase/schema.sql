-- Fluweel Events: contactformulieren in Supabase
-- Voer dit uit in Supabase Dashboard → SQL Editor

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  email text not null,
  telefoon text,
  bericht text not null,
  bron text not null default 'website',
  gelezen boolean not null default false,
  ontvangen_op timestamptz not null default now()
);

create index if not exists contact_submissions_ontvangen_op_idx
  on public.contact_submissions (ontvangen_op desc);

alter table public.contact_submissions enable row level security;

-- Alleen ingelogde Supabase-gebruikers mogen lezen en bijwerken.
create policy "Ingelogde admins mogen inzendingen lezen"
  on public.contact_submissions
  for select
  to authenticated
  using (true);

create policy "Ingelogde admins mogen inzendingen bijwerken"
  on public.contact_submissions
  for update
  to authenticated
  using (true)
  with check (true);

-- Inserts lopen via de Vercel API met de service role key (RLS wordt dan omzeild).
-- Maak admin-gebruikers aan via Supabase Dashboard → Authentication → Users.
