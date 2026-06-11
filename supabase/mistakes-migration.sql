-- Per-user mistake queue for stats review and spaced practice.
-- Run in the Supabase SQL Editor after settings-migration.sql.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

create table if not exists public.user_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null,
  selected_answer text,
  practice_streak integer not null default 0,
  last_mistaken_at timestamptz not null default now(),
  session_id uuid references public.game_sessions (id) on delete set null,
  constraint user_mistakes_user_question_unique unique (user_id, question_id),
  constraint user_mistakes_selected_answer_check check (
    selected_answer is null or selected_answer in ('A', 'B', 'C', 'D')
  ),
  constraint user_mistakes_practice_streak_check check (
    practice_streak >= 0 and practice_streak <= 3
  )
);

create index if not exists user_mistakes_user_id_idx
  on public.user_mistakes (user_id);

create index if not exists user_mistakes_user_last_mistaken_idx
  on public.user_mistakes (user_id, last_mistaken_at desc);

alter table public.user_mistakes enable row level security;

drop policy if exists "Users can read own mistakes" on public.user_mistakes;
create policy "Users can read own mistakes"
  on public.user_mistakes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own mistakes" on public.user_mistakes;
create policy "Users can insert own mistakes"
  on public.user_mistakes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own mistakes" on public.user_mistakes;
create policy "Users can update own mistakes"
  on public.user_mistakes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own mistakes" on public.user_mistakes;
create policy "Users can delete own mistakes"
  on public.user_mistakes
  for delete
  to authenticated
  using (auth.uid() = user_id);
