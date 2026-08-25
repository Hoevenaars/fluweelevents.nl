alter table public.quotes
  add column if not exists verwijderd_op timestamptz,
  add column if not exists verwijderd_reden text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quotes_verwijderd_reden_check'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_verwijderd_reden_check
      check (
        (verwijderd_op is null and verwijderd_reden is null)
        or (verwijderd_op is not null and verwijderd_reden in ('foutief', 'afgewezen'))
      );
  end if;
end $$;

create index if not exists idx_quotes_actief
  on public.quotes (aangemaakt_op desc)
  where verwijderd_op is null;
