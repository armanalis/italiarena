-- Game tables, matchmaking helpers, and security rules for Language Quiz.
-- Run this in the Supabase SQL Editor after schema.sql.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

-- gen_random_uuid() for primary keys
create extension if not exists "pgcrypto";

-- Per-player match history, accuracy by category, and recently seen question IDs.
-- seen_questions is a rolling list so we do not serve the same trivia too often.
create table if not exists public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  grammar_correct integer not null default 0,
  grammar_total integer not null default 0,
  vocab_correct integer not null default 0,
  vocab_total integer not null default 0,
  fill_blank_correct integer not null default 0,
  fill_blank_total integer not null default 0,
  idioms_correct integer not null default 0,
  idioms_total integer not null default 0,
  seen_questions uuid[] not null default '{}'::uuid[]
);

alter table public.player_stats enable row level security;

drop policy if exists "Users can read own player stats" on public.player_stats;
create policy "Users can read own player stats"
  on public.player_stats
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own player stats" on public.player_stats;
create policy "Users can update own player stats"
  on public.player_stats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own player stats" on public.player_stats;
create policy "Users can insert own player stats"
  on public.player_stats
  for insert
  with check (auth.uid() = user_id);

-- Live trivia pool. random_float helps us sample questions efficiently.
create table if not exists public.questions_active (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  level text not null,
  category text not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  random_float double precision not null default random(),
  constraint questions_active_category_check check (
    category in ('grammar', 'vocabulary', 'fill-in-the-blank', 'idioms')
  ),
  constraint questions_active_correct_answer_check check (
    correct_answer in ('A', 'B', 'C', 'D')
  )
);

create index if not exists questions_active_language_level_category_idx
  on public.questions_active (language, level, category);

alter table public.questions_active enable row level security;

drop policy if exists "Authenticated users can read active questions" on public.questions_active;
create policy "Authenticated users can read active questions"
  on public.questions_active
  for select
  to authenticated
  using (true);

-- Same shape as questions_active, plus a report counter for bad or broken questions.
create table if not exists public.questions_flagged (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  level text not null,
  category text not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  random_float double precision not null default random(),
  report_count integer not null default 0,
  constraint questions_flagged_category_check check (
    category in ('grammar', 'vocabulary', 'fill-in-the-blank', 'idioms')
  ),
  constraint questions_flagged_correct_answer_check check (
    correct_answer in ('A', 'B', 'C', 'D')
  )
);

alter table public.questions_flagged enable row level security;

drop policy if exists "Authenticated users can read flagged questions" on public.questions_flagged;
create policy "Authenticated users can read flagged questions"
  on public.questions_flagged
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can flag questions" on public.questions_flagged;
create policy "Authenticated users can flag questions"
  on public.questions_flagged
  for insert
  to authenticated
  with check (true);

-- A single 1v1 match between two players.
-- question_playlist stores the ordered list of question IDs for that session.
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references auth.users (id) on delete cascade,
  player_b_id uuid references auth.users (id) on delete set null,
  status text not null default 'waiting',
  question_playlist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint game_sessions_status_check check (
    status in ('waiting', 'active', 'completed', 'abandoned')
  )
);

create index if not exists game_sessions_player_a_id_idx
  on public.game_sessions (player_a_id);

create index if not exists game_sessions_status_idx
  on public.game_sessions (status);

alter table public.game_sessions enable row level security;

drop policy if exists "Authenticated users can read own game sessions" on public.game_sessions;
create policy "Authenticated users can read own game sessions"
  on public.game_sessions
  for select
  to authenticated
  using (auth.uid() = player_a_id or auth.uid() = player_b_id);

drop policy if exists "Authenticated users can insert game sessions" on public.game_sessions;
create policy "Authenticated users can insert game sessions"
  on public.game_sessions
  for insert
  to authenticated
  with check (auth.uid() = player_a_id);

drop policy if exists "Participants can update game sessions" on public.game_sessions;
create policy "Participants can update game sessions"
  on public.game_sessions
  for update
  to authenticated
  using (auth.uid() = player_a_id or auth.uid() = player_b_id)
  with check (auth.uid() = player_a_id or auth.uid() = player_b_id);

-- Ghost opponents are not real auth users.
alter table public.game_sessions
  drop constraint if exists game_sessions_player_b_id_fkey;

-- Saved run from a real player, replayed later as a ghost opponent.
create table if not exists public.ghost_matches (
  id uuid primary key default gen_random_uuid(),
  original_player_id uuid not null references auth.users (id) on delete cascade,
  language text not null,
  level text not null,
  match_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ghost_matches_lookup_idx
  on public.ghost_matches (language, level);

alter table public.ghost_matches enable row level security;

drop policy if exists "Authenticated users can read ghost matches" on public.ghost_matches;
create policy "Authenticated users can read ghost matches"
  on public.ghost_matches
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own ghost matches" on public.ghost_matches;
create policy "Users can insert own ghost matches"
  on public.ghost_matches
  for insert
  to authenticated
  with check (auth.uid() = original_player_id);

-- When someone signs up, create both their profile row and an empty stats row.
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

  insert into public.player_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Builds a guaranteed 10-question playlist for one match:
-- 3 grammar, 3 vocabulary, 3 fill-in-the-blank, 1 idioms (filled from any category if needed).
-- Raises INSUFFICIENT_QUESTIONS when the pool has fewer than 10 rows.
create or replace function public.get_random_questions(
  p_language text,
  p_level text,
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seen uuid[];
  v_pool_count integer;
  v_selected_count integer;
  v_result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*)::integer
  into v_pool_count
  from public.questions_active
  where language = p_language
    and level = p_level;

  if v_pool_count < 10 then
    raise exception 'INSUFFICIENT_QUESTIONS: need at least 10 questions for % / %', p_language, p_level;
  end if;

  select coalesce(seen_questions, '{}'::uuid[])
  into v_seen
  from public.player_stats
  where user_id = p_user_id;

  if v_seen is null then
    insert into public.player_stats (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    v_seen := '{}'::uuid[];
  end if;

  with ranked as (
    select
      q.*,
      row_number() over (
        partition by q.category
        order by (q.id = any (v_seen)) asc, random()
      ) as category_rank
    from public.questions_active q
    where q.language = p_language
      and q.level = p_level
  ),
  category_picks as (
    select id
    from ranked
    where (category = 'grammar' and category_rank <= 3)
       or (category = 'vocabulary' and category_rank <= 3)
       or (category = 'fill-in-the-blank' and category_rank <= 3)
       or (category = 'idioms' and category_rank <= 1)
  ),
  filler as (
    select q.id
    from public.questions_active q
    where q.language = p_language
      and q.level = p_level
      and q.id not in (select id from category_picks)
    order by (q.id = any (v_seen)) asc, random()
    limit greatest(
      0,
      10 - (select count(*)::integer from category_picks)
    )
  ),
  selected_ids as (
    select id from category_picks
    union
    select id from filler
    limit 10
  )
  select coalesce(json_agg(row_to_json(q) order by random()), '[]'::json)
  into v_result
  from public.questions_active q
  where q.id in (select id from selected_ids);

  select json_array_length(v_result)
  into v_selected_count;

  if v_selected_count < 10 then
    raise exception 'INSUFFICIENT_QUESTIONS: could only assemble % of 10 questions', v_selected_count;
  end if;

  return v_result;
end;
$$;

-- Sudden-death pick: any category/topic, uniformly random (excluding main-match IDs).
create or replace function public.get_tiebreaker_question(
  p_language text,
  p_level text,
  p_user_id uuid,
  p_exclude_ids uuid[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select row_to_json(q)
  into v_result
  from public.questions_active q
  where q.language = p_language
    and q.level = p_level
    and not (q.id = any (coalesce(p_exclude_ids, '{}'::uuid[])))
  order by random()
  limit 1;

  return v_result;
end;
$$;

-- Remember which questions a player has already answered.
-- Keeps only the 500 most recent IDs so the list does not grow forever.
create or replace function public.update_seen_questions(
  p_user_id uuid,
  p_question_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_combined uuid[];
  v_length integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.player_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select coalesce(seen_questions, '{}'::uuid[]) || coalesce(p_question_ids, '{}'::uuid[])
  into v_combined
  from public.player_stats
  where user_id = p_user_id;

  v_length := coalesce(array_length(v_combined, 1), 0);

  if v_length > 500 then
    v_combined := v_combined[(v_length - 499):v_length];
  end if;

  update public.player_stats
  set seen_questions = v_combined
  where user_id = p_user_id;
end;
$$;

grant execute on function public.get_random_questions(text, text, uuid) to authenticated;
grant execute on function public.get_tiebreaker_question(text, text, uuid, uuid[]) to authenticated;
grant execute on function public.update_seen_questions(uuid, uuid[]) to authenticated;
