-- User profiles and auth setup for Language Quiz.
-- Paste this into the Supabase SQL Editor before running database.sql.
-- Safe to re-run: run the ENTIRE file (do not run CREATE POLICY blocks alone).

-- App-level profile linked to Supabase Auth.
-- target_language and proficiency_level are filled in during onboarding.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  target_language text,
  proficiency_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists role text not null default 'user';

alter table public.users
  add column if not exists display_name text,
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists haptics_enabled boolean not null default true;

alter table public.users
  drop constraint if exists users_proficiency_level_check;

alter table public.users
  add constraint users_proficiency_level_check check (
    proficiency_level is null
    or proficiency_level in ('A1', 'A1-A2', 'A2', 'A2-B1', 'B1', 'B2', 'C1')
  );

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check check (role in ('user', 'admin'));

alter table public.users
  drop constraint if exists users_display_name_check;

alter table public.users
  add constraint users_display_name_check check (
    display_name is null
    or (char_length(trim(display_name)) between 2 and 24)
  );

alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;

create policy "Users can read own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

-- Creates a public.users row the moment someone signs up through Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keeps updated_at fresh whenever a profile changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();
