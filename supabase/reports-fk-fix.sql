-- Allow reports on questions that were already quarantined (removed from questions_active).
-- Run in the Supabase SQL Editor on existing databases after reports-migration.sql.

alter table public.reports
  drop constraint if exists reports_question_id_fkey;

-- Keep report counts in sync when additional players report an already-quarantined question.
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

  if v_count >= 1 then
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
        v_count
      )
      on conflict (id) do update
      set report_count = excluded.report_count;

      delete from public.questions_active
      where id = new.question_id;
    else
      update public.questions_flagged
      set report_count = v_count
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
