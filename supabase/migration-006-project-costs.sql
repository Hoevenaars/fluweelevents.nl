-- Rekentoolregels onder een project (inkoop, marge, verkoop, bevestigd/betaald)

create table if not exists public.project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  leverancier text not null default '',
  wat text not null default '',
  prijs numeric(10,2) not null default 0,
  marge_pct numeric(6,2) not null default 0,
  verkoopprijs numeric(10,2) not null default 0,
  opmerking text not null default '',
  bevestigd_betaald boolean not null default false,
  sort_order int not null default 0,
  aangemaakt_op timestamptz not null default now()
);

create index if not exists project_costs_project_id_idx
  on public.project_costs (project_id, sort_order);

alter table public.project_costs enable row level security;

drop policy if exists "admin_all_project_costs" on public.project_costs;
create policy "admin_all_project_costs" on public.project_costs
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on table public.project_costs to authenticated;
grant select, insert, update, delete on table public.project_costs to service_role;
revoke all on table public.project_costs from anon;
