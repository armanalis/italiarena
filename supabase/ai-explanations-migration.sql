-- AI explanations cache + per-match usage tracking for Groq "Ask AI".
-- Run in the Supabase SQL Editor after reports-migration.sql.

create table if not exists public.question_ai_explanations (
  cache_key text primary key,
  question_id uuid not null,
  selected_answer text,
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists question_ai_explanations_question_id_idx
  on public.question_ai_explanations (question_id);

alter table public.question_ai_explanations enable row level security;

drop policy if exists "Authenticated users can read AI explanations" on public.question_ai_explanations;
create policy "Authenticated users can read AI explanations"
  on public.question_ai_explanations
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert AI explanations" on public.question_ai_explanations;
create policy "Authenticated users can insert AI explanations"
  on public.question_ai_explanations
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update AI explanations" on public.question_ai_explanations;
create policy "Authenticated users can update AI explanations"
  on public.question_ai_explanations
  for update
  to authenticated
  using (true)
  with check (true);

create table if not exists public.match_ai_asks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  question_id uuid not null,
  cache_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_ai_asks_user_session_idx
  on public.match_ai_asks (user_id, session_id);

alter table public.match_ai_asks enable row level security;

drop policy if exists "Users can read own match AI asks" on public.match_ai_asks;
create policy "Users can read own match AI asks"
  on public.match_ai_asks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own match AI asks" on public.match_ai_asks;
create policy "Users can insert own match AI asks"
  on public.match_ai_asks
  for insert
  to authenticated
  with check (auth.uid() = user_id);
