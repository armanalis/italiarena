-- Matchmaking updates for game_sessions.
-- Run in the Supabase SQL Editor after database.sql.
-- Also enable Realtime on the game_sessions table (Database → Replication).
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

-- Store language/level on the session so we can match waiting players quickly.
alter table public.game_sessions
  add column if not exists language text,
  add column if not exists level text;

create index if not exists game_sessions_matchmaking_idx
  on public.game_sessions (status, language, level)
  where status = 'waiting';

-- Let authenticated users see open lobbies they might join.
drop policy if exists "Users can read joinable waiting sessions" on public.game_sessions;
create policy "Users can read joinable waiting sessions"
  on public.game_sessions
  for select
  to authenticated
  using (status = 'waiting' and player_b_id is null);

-- Let a second player claim an open waiting slot.
drop policy if exists "Users can join waiting sessions" on public.game_sessions;
create policy "Users can join waiting sessions"
  on public.game_sessions
  for update
  to authenticated
  using (status = 'waiting' and player_b_id is null)
  with check (auth.uid() = player_b_id and status = 'active');

-- Let the host assign a ghost opponent on their own waiting session.
drop policy if exists "Hosts can activate ghost opponent" on public.game_sessions;
create policy "Hosts can activate ghost opponent"
  on public.game_sessions
  for update
  to authenticated
  using (
    auth.uid() = player_a_id
    and status = 'waiting'
    and player_b_id is null
  )
  with check (auth.uid() = player_a_id and status = 'active');

-- Ghost opponents are not real auth users, so player_b_id cannot stay FK-constrained.
alter table public.game_sessions
  drop constraint if exists game_sessions_player_b_id_fkey;
