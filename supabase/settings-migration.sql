-- Settings, display names, user preferences, and match history.
-- Run in the Supabase SQL Editor after schema.sql and database.sql.

alter table public.users
  add column if not exists display_name text,
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists haptics_enabled boolean not null default true;

alter table public.users
  drop constraint if exists users_display_name_check;

alter table public.users
  add constraint users_display_name_check check (
    display_name is null
    or (char_length(trim(display_name)) between 2 and 24)
  );

-- Completed match summaries for recent history and statistics.
create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.game_sessions (id) on delete set null,
  opponent_type text not null,
  opponent_display_name text not null,
  user_score integer not null default 0,
  opponent_score integer not null default 0,
  result text not null,
  language text not null,
  level text not null,
  played_at timestamptz not null default now(),
  constraint match_history_opponent_type_check check (
    opponent_type in ('real', 'ghost')
  ),
  constraint match_history_result_check check (
    result in ('win', 'loss', 'tie')
  )
);

create index if not exists match_history_user_played_at_idx
  on public.match_history (user_id, played_at desc);

alter table public.match_history enable row level security;

drop policy if exists "Users can read own match history" on public.match_history;
create policy "Users can read own match history"
  on public.match_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own match history" on public.match_history;
create policy "Users can insert own match history"
  on public.match_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own match history" on public.match_history;
create policy "Users can delete own match history"
  on public.match_history
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Permanently removes the signed-in auth user and cascaded app data.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
