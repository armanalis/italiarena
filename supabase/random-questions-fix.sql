-- Rotate category picks between matches (3 grammar, 3 vocab, 3 fill-in-the-blank, 1 idioms).
-- Run in the Supabase SQL Editor after deploying app changes.

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
  v_recent_ids uuid[];
  v_last_playlist jsonb;
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

  select gs.question_playlist
  into v_last_playlist
  from public.game_sessions gs
  where (gs.player_a_id = p_user_id or gs.player_b_id = p_user_id)
    and jsonb_typeof(gs.question_playlist) = 'array'
    and jsonb_array_length(gs.question_playlist) > 0
  order by gs.created_at desc
  limit 1;

  if v_last_playlist is null then
    v_recent_ids := '{}'::uuid[];
  else
    select coalesce(array_agg(elem::uuid), '{}'::uuid[])
    into v_recent_ids
    from jsonb_array_elements_text(v_last_playlist) as elem;
  end if;

  with ranked as (
    select
      q.*,
      row_number() over (
        partition by q.category
        order by
          (q.id = any (v_recent_ids)) asc,
          (q.id = any (v_seen)) asc,
          random()
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
    order by
      (q.id = any (v_recent_ids)) asc,
      (q.id = any (v_seen)) asc,
      random()
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
