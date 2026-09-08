-- Bevestigd en betaald zijn aparte statussen op rekentoolregels

alter table public.project_costs
  add column if not exists bevestigd boolean not null default false;

alter table public.project_costs
  add column if not exists betaald boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_costs'
      and column_name = 'bevestigd_betaald'
  ) then
    update public.project_costs
    set bevestigd = true, betaald = true
    where bevestigd_betaald is true;

    alter table public.project_costs drop column bevestigd_betaald;
  end if;
end $$;
