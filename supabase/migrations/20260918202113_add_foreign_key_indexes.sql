-- Cover composite foreign keys reported by the Supabase performance advisor.

create index if not exists pipa_game_question_results_session_quiz_idx
  on public.pipa_game_question_results(session_id, quiz_id);

create index if not exists pipa_options_question_quiz_idx
  on public.pipa_options(question_id, quiz_id);

create index if not exists pipa_quizzes_invitation_asset_id_idx
  on public.pipa_quizzes(invitation_asset_id)
  where invitation_asset_id is not null;

create index if not exists pipa_rsvps_session_quiz_idx
  on public.pipa_rsvps(session_id, quiz_id);
