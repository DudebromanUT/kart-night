-- Local testing only: the small part of Supabase the schema relies on
-- (the anon and authenticated roles, auth.users and auth.uid()).
-- Never run this against the real Supabase project.

create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),  -- the family login
  ('00000000-0000-0000-0000-00000000000b');  -- someone else
