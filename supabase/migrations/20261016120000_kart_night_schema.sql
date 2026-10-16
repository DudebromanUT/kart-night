-- Kart Night database: households, players, current rides, cups and rallies,
-- races and results. Paste into Supabase: SQL Editor > New query > Run.
--
-- Every row belongs to a household (a family). Row Level Security lets a
-- signed-in user reach only the households they are a member of, so one shared
-- family login and separate personal logins both work without changes.

-- Grand Prix points for a 24-racer field (1st = 15 ... 24th = 1).
create function public.points_for(place integer)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select (array[15,12,10,9,9,8,8,7,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2,1])[place]::smallint
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, household_id)
);
create index players_household_idx on public.players (household_id);

-- What each player is driving right now, set by the Spin screen.
create table public.current_rides (
  player_id uuid primary key,
  household_id uuid not null,
  driver_id text,
  outfit text,
  vehicle_id text,
  updated_at timestamptz not null default now(),
  foreign key (player_id, household_id) references public.players (id, household_id) on delete cascade
);

-- A Grand Prix cup (kind 'gp', up to 4 races) or a Knockout Tour rally (kind 'ko', 1 result).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('gp', 'ko')),
  track_id text not null,
  started_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, household_id)
);
create index events_household_started_idx on public.events (household_id, started_at desc);

create table public.event_players (
  event_id uuid not null,
  player_id uuid not null,
  household_id uuid not null,
  primary key (event_id, player_id),
  foreign key (event_id, household_id) references public.events (id, household_id) on delete cascade,
  foreign key (player_id, household_id) references public.players (id, household_id) on delete cascade
);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  household_id uuid not null,
  race_no smallint not null check (race_no between 1 and 4),
  course text not null,
  raced_at timestamptz not null default now(),
  unique (event_id, race_no),
  unique (id, household_id),
  foreign key (event_id, household_id) references public.events (id, household_id) on delete cascade
);

-- One finishing place per player per race. Points are worked out by the database.
create table public.results (
  race_id uuid not null,
  player_id uuid not null,
  household_id uuid not null,
  place smallint not null check (place between 1 and 24),
  points smallint generated always as (public.points_for(place)) stored,
  driver_id text,
  outfit text,
  vehicle_id text,
  primary key (race_id, player_id),
  unique (race_id, place),
  foreign key (race_id, household_id) references public.races (id, household_id) on delete cascade,
  foreign key (player_id, household_id) references public.players (id, household_id) on delete cascade
);
create index results_player_idx on public.results (player_id);

-- Membership check used by every policy. Security definer so it can read
-- household_members without tripping that table's own policy.
create function public.is_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = target_household and m.user_id = (select auth.uid())
  )
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.players enable row level security;
alter table public.current_rides enable row level security;
alter table public.events enable row level security;
alter table public.event_players enable row level security;
alter table public.races enable row level security;
alter table public.results enable row level security;

create policy "Members read their household" on public.households
  for select to authenticated using (public.is_member(id));
create policy "Members rename their household" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "Members see who else is in the household" on public.household_members
  for select to authenticated using (public.is_member(household_id));

create policy "Members manage players" on public.players
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "Members manage current rides" on public.current_rides
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "Members manage events" on public.events
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "Members manage event players" on public.event_players
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "Members manage races" on public.races
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "Members manage results" on public.results
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

-- Start a household for the signed-in user, with its first players.
create function public.create_household(household_name text, player_names text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  insert into public.households (name) values (household_name) returning id into new_id;
  insert into public.household_members (household_id, user_id) values (new_id, auth.uid());
  for i in 1 .. coalesce(array_length(player_names, 1), 0) loop
    insert into public.players (household_id, name, sort_order) values (new_id, player_names[i], i);
  end loop;
  return new_id;
end
$$;

-- Join an existing household with its invite code (for personal logins later).
create function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select id into target from public.households where invite_code = upper(trim(code));
  if target is null then
    raise exception 'No family uses that invite code';
  end if;
  insert into public.household_members (household_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;
  return target;
end
$$;

-- One row per result with names and context, for reports and stats.
create view public.race_results
with (security_invoker = true)
as
select
  r.household_id,
  e.id as event_id,
  e.kind,
  e.track_id,
  e.started_at,
  ra.race_no,
  ra.course,
  ra.raced_at,
  p.id as player_id,
  p.name as player,
  r.place,
  r.points,
  r.driver_id,
  r.outfit,
  r.vehicle_id
from public.results r
join public.races ra on ra.id = r.race_id
join public.events e on e.id = ra.event_id
join public.players p on p.id = r.player_id;

-- Signed-in users reach the tables (policies above still limit rows);
-- signed-out visitors reach nothing.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant select, insert, update, delete on
  public.players, public.current_rides, public.events, public.event_players, public.races, public.results
  to authenticated;
grant select, update on public.households to authenticated;
grant select on public.household_members, public.race_results to authenticated;
grant execute on function public.create_household(text, text[]), public.join_household(text), public.is_member(uuid), public.points_for(integer)
  to authenticated;

-- Live updates between devices (Supabase Realtime honors the policies above).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.players, public.current_rides, public.events, public.event_players, public.races, public.results;
  end if;
end
$$;
