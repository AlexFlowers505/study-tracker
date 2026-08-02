alter table days add column if not exists sleep jsonb not null default '[]'::jsonb;
