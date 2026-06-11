-- Allow user_mistakes to reference quarantined questions (not only questions_active).
-- Run in the Supabase SQL Editor on existing databases after mistakes-migration.sql.

alter table public.user_mistakes
  drop constraint if exists user_mistakes_question_id_fkey;
