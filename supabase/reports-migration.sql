-- Post-match flagging, auto-quarantine triggers, and admin role support.
-- Run in the Supabase SQL Editor after database.sql.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

-- Admin role on user profiles (default: regular user).
alter table public.users
  add column if not exists role text not null default 'user';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check check (role in ('user', 'admin'));

-- Player-submitted issue reports for active questions.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions_active (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  issue_type text not null,
  created_at timestamptz not null default now(),
  constraint reports_question_reporter_unique unique (question_id, reporter_id),
  constraint reports_issue_type_check check (
    issue_type in ('typo', 'wrong_answer', 'unnatural_phrasing')
  )
);

create index if not exists reports_question_id_idx
  on public.reports (question_id);

alter table public.reports enable row level security;

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Admins can read all reports" on public.reports;
create policy "Admins can read all reports"
  on public.reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
  on public.reports
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin management of the active and flagged question pools.
drop policy if exists "Admins can insert active questions" on public.questions_active;
create policy "Admins can insert active questions"
  on public.questions_active
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete active questions" on public.questions_active;
create policy "Admins can delete active questions"
  on public.questions_active
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update flagged questions" on public.questions_flagged;
create policy "Admins can update flagged questions"
  on public.questions_flagged
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete flagged questions" on public.questions_flagged;
create policy "Admins can delete flagged questions"
  on public.questions_flagged
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- When a question hits 3 unique reports, quarantine it atomically.
create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_question public.questions_active%rowtype;
begin
  select count(*)::integer
  into v_count
  from public.reports
  where question_id = new.question_id;

  if v_count = 3 then
    select *
    into v_question
    from public.questions_active
    where id = new.question_id
    for update;

    if found then
      insert into public.questions_flagged (
        id,
        language,
        level,
        category,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        random_float,
        report_count
      )
      values (
        v_question.id,
        v_question.language,
        v_question.level,
        v_question.category,
        v_question.question_text,
        v_question.option_a,
        v_question.option_b,
        v_question.option_c,
        v_question.option_d,
        v_question.correct_answer,
        v_question.random_float,
        3
      )
      on conflict (id) do update
      set report_count = 3;

      delete from public.questions_active
      where id = new.question_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_report_inserted on public.reports;

create trigger on_report_inserted
  after insert on public.reports
  for each row
  execute function public.handle_new_report();
