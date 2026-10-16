-- Checks the schema and its access rules. Run by scripts/test-db.sh after
-- local_auth_stub.sql and the migrations.

\set ON_ERROR_STOP 1
\set QUIET 1

-- The family login sets up a household with four racers.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_household('Family', array['Mom', 'Dad', 'Kid', 'Player 4']) as hid \gset
set kart.hid = :'hid';
select id as mom from public.players where name = 'Mom' \gset
select id as dad from public.players where name = 'Dad' \gset
select id as kid from public.players where name = 'Kid' \gset
set kart.kid = :'kid';

insert into public.events (household_id, kind, track_id) values (:'hid', 'gp', 'mushroom') returning id as eid \gset
set kart.eid = :'eid';
insert into public.event_players (event_id, player_id, household_id) values (:'eid', :'mom', :'hid'), (:'eid', :'dad', :'hid');
insert into public.races (event_id, household_id, race_no, course) values (:'eid', :'hid', 1, 'Mario Bros. Circuit') returning id as rid \gset
set kart.rid = :'rid';
insert into public.results (race_id, player_id, household_id, place, driver_id, outfit, vehicle_id)
values (:'rid', :'mom', :'hid', 1, 'peach', 'Aviator', 'cute-scoot'),
       (:'rid', :'dad', :'hid', 5, 'bowser', 'Regular', 'standard-kart');
insert into public.current_rides (player_id, household_id, driver_id) values (:'kid', :'hid', 'cow');

do $$
begin
  assert (select count(*) from public.players) = 4, 'family sees its 4 racers';
  assert (select sum(points) from public.race_results) = 24, '1st (15) + 5th (9) = 24 points';
  assert (select created_by from public.events limit 1) = '00000000-0000-0000-0000-00000000000a', 'event records who started it';
end
$$;

-- Two family racers can't share a place in one race.
do $$
begin
  begin
    insert into public.results (race_id, player_id, household_id, place)
    values (current_setting('kart.rid')::uuid, current_setting('kart.kid')::uuid, current_setting('kart.hid')::uuid, 1);
    raise exception 'duplicate place was accepted';
  exception when unique_violation then null;
  end;
end
$$;

-- Places stop at 24th.
do $$
begin
  begin
    insert into public.results (race_id, player_id, household_id, place)
    values (current_setting('kart.rid')::uuid, current_setting('kart.kid')::uuid, current_setting('kart.hid')::uuid, 25);
    raise exception '25th place was accepted';
  exception when check_violation then null;
  end;
  assert public.points_for(24) = 1, '24th scores 1';
  assert public.points_for(5) = 9, '5th scores 9';
end
$$;

select invite_code as code from public.households where id = :'hid' \gset

-- Someone else signs in: they see nothing and can't write into the family's data.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
begin
  assert (select count(*) from public.households) = 0, 'stranger sees no households';
  assert (select count(*) from public.players) = 0, 'stranger sees no players';
  assert (select count(*) from public.race_results) = 0, 'stranger sees no results';
  begin
    insert into public.players (household_id, name) values (current_setting('kart.hid')::uuid, 'Intruder');
    raise exception 'stranger added a player to the family';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.results) = 0, 'still nothing visible';
end
$$;

-- Even with their own household, they can't attach rows to the family's cup.
select public.create_household('Other family', array['X']) as hid2 \gset
set kart.hid2 = :'hid2';
do $$
begin
  begin
    insert into public.races (event_id, household_id, race_no, course)
    values (current_setting('kart.eid')::uuid, current_setting('kart.hid2')::uuid, 2, 'Crown City');
    raise exception 'race attached to another household''s cup';
  exception when foreign_key_violation then null;
  end;
  assert (select count(*) from public.players) = 1, 'they see only their own racer';
end
$$;

-- With the family's invite code they join and see the family's data.
select public.join_household(:'code') is not null as joined \gset
do $$
begin
  assert (select count(*) from public.players where household_id = current_setting('kart.hid')::uuid) = 4, 'joined member sees the family';
  assert (select count(*) from public.race_results where household_id = current_setting('kart.hid')::uuid) = 2, 'and its results';
end
$$;

-- Signed-out visitors reach nothing.
reset request.jwt.claim.sub;
set role anon;
do $$
begin
  begin
    perform count(*) from public.players;
    raise exception 'signed-out visitor read players';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_household('Nope', array['x']);
    raise exception 'signed-out visitor created a household';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

\echo 'Database checks passed'
