-- Guaranteed 10-question playlists + optional tiebreaker question.
-- Run in the Supabase SQL Editor after database.sql.

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
        order by (q.id = any (v_seen)) asc, q.random_float desc, random()
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
    order by (q.id = any (v_seen)) asc, q.random_float desc, random()
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
  select coalesce(json_agg(row_to_json(q)), '[]'::json)
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

grant execute on function public.get_random_questions(text, text, uuid) to authenticated;
grant execute on function public.get_tiebreaker_question(text, text, uuid, uuid[]) to authenticated;
