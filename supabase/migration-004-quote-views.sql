alter table public.quotes
  add column if not exists bekeken_aantal int not null default 0,
  add column if not exists laatst_bekeken_op timestamptz,
  add column if not exists bekeken_op timestamptz[] not null default '{}';
