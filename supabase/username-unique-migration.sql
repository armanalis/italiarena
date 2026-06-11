-- Unique usernames for sign-in (case-insensitive).
-- Run in the Supabase SQL Editor after settings-migration.sql.

create unique index if not exists users_display_name_unique_ci
  on public.users (lower(trim(display_name)))
  where display_name is not null;
