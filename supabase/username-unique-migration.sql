-- Unique usernames + login lookup (no service-role key required on Vercel).
-- Run in the Supabase SQL Editor after settings-migration.sql.

create unique index if not exists users_display_name_unique_ci
  on public.users (lower(trim(display_name)))
  where display_name is not null;

-- Resolve email or username to an auth email for sign-in.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when position('@' in trim(p_identifier)) > 0 then trim(p_identifier)
    else (
      select u.email
      from public.users u
      where u.display_name is not null
        and lower(trim(u.display_name)) = lower(trim(p_identifier))
      limit 1
    )
  end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated, service_role;

-- Check username availability during sign-up and profile updates.
create or replace function public.is_display_name_taken(
  p_display_name text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.display_name is not null
      and lower(trim(u.display_name)) = lower(trim(p_display_name))
      and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
  );
$$;

revoke all on function public.is_display_name_taken(text, uuid) from public;
grant execute on function public.is_display_name_taken(text, uuid) to anon, authenticated, service_role;
