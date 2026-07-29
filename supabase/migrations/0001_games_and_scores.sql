create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null default 0,
  plays text not null default '0'
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  user_id uuid null,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
