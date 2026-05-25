-- Phase 7: Production performance indexes for Language Quiz.
-- Run in the Supabase SQL Editor after database.sql and matchmaking-migration.sql.
-- All statements are idempotent (safe to re-run).

-- 1. Question pool lookups for get_random_questions RPC
--    Filters by (language, level, category) on every category slice.
create index if not exists questions_active_language_level_category_idx
  on public.questions_active (language, level, category);

-- Optional covering index for random sampling within each category bucket.
create index if not exists questions_active_lookup_random_idx
  on public.questions_active (language, level, category, random_float);

-- 2. Leaderboard and bracket joins on users
--    Speeds up ranking queries filtered by target language and proficiency.
create index if not exists users_target_language_proficiency_idx
  on public.users (target_language, proficiency_level)
  where target_language is not null
    and proficiency_level is not null;

-- 3. Matchmaking loop scans on game_sessions
--    Composite index for status + language + level filters.
create index if not exists game_sessions_status_language_level_idx
  on public.game_sessions (status, language, level);

-- Partial index keeps waiting-lobby scans minimal (preferred by the matchmaker).
create index if not exists game_sessions_matchmaking_idx
  on public.game_sessions (status, language, level)
  where status = 'waiting';

-- Refresh planner statistics after index creation.
analyze public.questions_active;
analyze public.users;
analyze public.game_sessions;
