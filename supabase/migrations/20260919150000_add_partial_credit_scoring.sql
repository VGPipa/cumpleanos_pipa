-- Award 10 points for an exact answer, 5 when at least one correct option is
-- selected in a non-exact answer, and 0 when no correct option is selected.

create or replace function public.pipa_submit_answer(
  p_session_id uuid,
  p_write_token_hash text,
  p_question_position smallint,
  p_selected_option_keys text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  game_session public.pipa_game_sessions%rowtype;
  question public.pipa_questions%rowtype;
  selected_count integer;
  distinct_count integer;
  valid_count integer;
  correct_selected integer;
  correct_total integer;
  question_total_points integer;
  points integer;
  fully_correct boolean;
  answered_count integer;
  question_total integer;
  total_score integer;
  finished boolean;
  elapsed integer;
  correct_keys text[];
begin
  if p_write_token_hash is null or p_write_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Sesión no encontrada';
  end if;

  select * into game_session
  from public.pipa_game_sessions
  where id = p_session_id
  for update;

  if not found or game_session.write_token_hash <> p_write_token_hash then
    raise exception 'Sesión no encontrada';
  end if;

  if game_session.status <> 'started' then
    raise exception 'La partida ya fue completada';
  end if;

  select * into question
  from public.pipa_questions
  where quiz_id = game_session.quiz_id
    and position = p_question_position;

  if not found then
    raise exception 'Pregunta inválida';
  end if;

  select count(*) into answered_count
  from public.pipa_game_question_results
  where session_id = game_session.id;

  if p_question_position <> answered_count + 1 then
    raise exception 'Las preguntas deben responderse en orden';
  end if;

  selected_count := coalesce(array_length(p_selected_option_keys, 1), 0);
  select count(distinct option_key) into distinct_count
  from unnest(coalesce(p_selected_option_keys, array[]::text[])) as selected(option_key);

  if selected_count < 1
    or selected_count > question.max_selections
    or distinct_count <> selected_count then
    raise exception 'Respuesta inválida';
  end if;

  select
    count(*) filter (where option_key = any(p_selected_option_keys)),
    count(*) filter (where is_correct and option_key = any(p_selected_option_keys)),
    count(*) filter (where is_correct),
    array_agg(option_key order by display_order) filter (where is_correct)
  into valid_count, correct_selected, correct_total, correct_keys
  from public.pipa_options
  where question_id = question.id
    and quiz_id = question.quiz_id;

  if valid_count <> selected_count then
    raise exception 'Respuesta inválida';
  end if;

  fully_correct := correct_selected = correct_total and selected_count = correct_total;
  question_total_points := correct_total * question.points_per_correct;
  points := case
    when fully_correct then question_total_points
    when correct_selected > 0 then round(question_total_points / 2.0)::integer
    else 0
  end;

  insert into public.pipa_game_question_results (
    session_id, quiz_id, question_id, selected_option_count, points_awarded, is_fully_correct
  ) values (
    game_session.id, game_session.quiz_id, question.id, selected_count, points, fully_correct
  );

  insert into public.pipa_game_answer_options (session_id, question_id, option_id, is_correct)
  select game_session.id, question.id, option.id, option.is_correct
  from public.pipa_options option
  where option.question_id = question.id
    and option.quiz_id = question.quiz_id
    and option.option_key = any(p_selected_option_keys);

  select count(*) into question_total
  from public.pipa_questions
  where quiz_id = game_session.quiz_id;

  select coalesce(sum(points_awarded), 0)::integer into total_score
  from public.pipa_game_question_results
  where session_id = game_session.id;

  finished := answered_count + 1 = question_total;
  elapsed := null;

  if finished then
    elapsed := least(
      86400000,
      greatest(0, floor(extract(epoch from (clock_timestamp() - game_session.started_at)) * 1000)::integer)
    );

    update public.pipa_game_sessions
    set status = 'completed', score = total_score, elapsed_ms = elapsed,
        completed_at = now(), last_activity_at = now()
    where id = game_session.id;
  else
    update public.pipa_game_sessions
    set last_activity_at = now()
    where id = game_session.id;
  end if;

  return jsonb_build_object(
    'puntos', points,
    'correctas', to_jsonb(correct_keys),
    'acierto_completo', fully_correct,
    'puntaje_total', total_score,
    'finalizado', finished,
    'tiempo', elapsed
  );
end;
$$;
