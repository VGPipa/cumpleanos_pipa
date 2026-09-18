-- Cumple de Pipa: contenido del reto, partidas, respuestas, RSVP y estadísticas.
-- Estas tablas son privadas para el navegador: el backend usa la secret key de
-- Supabase y no se crean políticas RLS para anon ni authenticated.

do $$
begin
  create type public.pipa_question_kind as enum ('single', 'multiple');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pipa_game_status as enum ('started', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pipa_rsvp_status as enum ('yes', 'maybe', 'no');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pipa_quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_date date,
  event_time time without time zone,
  event_timezone text,
  venue_name text,
  venue_address text,
  venue_detail text,
  map_url text,
  invitation_asset_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pipa_quizzes_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint pipa_quizzes_title_check check (char_length(btrim(title)) > 0)
);

create table if not exists public.pipa_assets (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.pipa_quizzes(id) on delete cascade,
  asset_key text not null,
  asset_kind text not null,
  public_path text not null,
  alt_text text,
  mime_type text not null,
  created_at timestamptz not null default now(),
  constraint pipa_assets_key_check check (asset_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint pipa_assets_kind_check check (asset_kind in ('question_image', 'option_image', 'invitation')),
  constraint pipa_assets_path_check check (left(public_path, 1) = '/'),
  constraint pipa_assets_quiz_asset_key_unique unique (quiz_id, asset_key),
  constraint pipa_assets_id_quiz_unique unique (id, quiz_id)
);

alter table public.pipa_quizzes
  add constraint pipa_quizzes_invitation_asset_fkey
  foreign key (invitation_asset_id) references public.pipa_assets(id) on delete set null;

create table if not exists public.pipa_questions (
  id bigint generated always as identity primary key,
  quiz_id uuid not null references public.pipa_quizzes(id) on delete cascade,
  position smallint not null,
  prompt text not null,
  kind public.pipa_question_kind not null,
  points_per_correct smallint not null,
  max_selections smallint not null,
  image_asset_id uuid references public.pipa_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint pipa_questions_position_check check (position > 0),
  constraint pipa_questions_prompt_check check (char_length(btrim(prompt)) > 0),
  constraint pipa_questions_points_check check (points_per_correct > 0),
  constraint pipa_questions_max_selections_check check (
    (kind = 'single' and max_selections = 1)
    or (kind = 'multiple' and max_selections between 2 and 10)
  ),
  constraint pipa_questions_quiz_position_unique unique (quiz_id, position),
  constraint pipa_questions_id_quiz_unique unique (id, quiz_id)
);

create table if not exists public.pipa_options (
  id bigint generated always as identity primary key,
  quiz_id uuid not null,
  question_id bigint not null,
  option_key text not null,
  display_order smallint not null,
  option_text text not null,
  image_asset_id uuid references public.pipa_assets(id) on delete set null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  constraint pipa_options_question_fkey
    foreign key (question_id, quiz_id)
    references public.pipa_questions(id, quiz_id)
    on delete cascade,
  constraint pipa_options_key_check check (option_key ~ '^[A-Z0-9_-]{1,12}$'),
  constraint pipa_options_display_order_check check (display_order > 0),
  constraint pipa_options_text_check check (char_length(btrim(option_text)) > 0),
  constraint pipa_options_question_key_unique unique (question_id, option_key),
  constraint pipa_options_question_id_unique unique (question_id, id)
);

create table if not exists public.pipa_game_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.pipa_quizzes(id) on delete cascade,
  player_name text not null,
  write_token_hash text not null unique,
  status public.pipa_game_status not null default 'started',
  score smallint,
  elapsed_ms integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  constraint pipa_game_sessions_player_name_check check (char_length(btrim(player_name)) between 1 and 60),
  constraint pipa_game_sessions_token_check check (write_token_hash ~ '^[a-f0-9]{64}$'),
  constraint pipa_game_sessions_score_check check (score is null or score >= 0),
  constraint pipa_game_sessions_elapsed_check check (elapsed_ms is null or elapsed_ms between 0 and 86400000),
  constraint pipa_game_sessions_completion_check check (
    (status = 'started' and score is null and elapsed_ms is null and completed_at is null)
    or (status = 'completed' and score is not null and elapsed_ms is not null and completed_at is not null)
  ),
  constraint pipa_game_sessions_id_quiz_unique unique (id, quiz_id)
);

create table if not exists public.pipa_game_question_results (
  session_id uuid not null,
  quiz_id uuid not null,
  question_id bigint not null,
  selected_option_count smallint not null,
  points_awarded smallint not null,
  is_fully_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id),
  constraint pipa_game_question_results_session_fkey
    foreign key (session_id, quiz_id)
    references public.pipa_game_sessions(id, quiz_id)
    on delete cascade,
  constraint pipa_game_question_results_question_fkey
    foreign key (question_id, quiz_id)
    references public.pipa_questions(id, quiz_id)
    on delete cascade,
  constraint pipa_game_question_results_selected_count_check check (selected_option_count between 1 and 10),
  constraint pipa_game_question_results_points_check check (points_awarded >= 0)
);

create table if not exists public.pipa_game_answer_options (
  session_id uuid not null,
  question_id bigint not null,
  option_id bigint not null,
  is_correct boolean not null,
  selected_at timestamptz not null default now(),
  primary key (session_id, question_id, option_id),
  constraint pipa_game_answer_options_result_fkey
    foreign key (session_id, question_id)
    references public.pipa_game_question_results(session_id, question_id)
    on delete cascade,
  constraint pipa_game_answer_options_option_fkey
    foreign key (question_id, option_id)
    references public.pipa_options(question_id, id)
    on delete cascade
);

create table if not exists public.pipa_rsvps (
  session_id uuid primary key,
  quiz_id uuid not null,
  status public.pipa_rsvp_status not null,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipa_rsvps_session_fkey
    foreign key (session_id, quiz_id)
    references public.pipa_game_sessions(id, quiz_id)
    on delete cascade
);

create index if not exists pipa_options_image_asset_id_idx
  on public.pipa_options(image_asset_id)
  where image_asset_id is not null;

create index if not exists pipa_questions_image_asset_id_idx
  on public.pipa_questions(image_asset_id)
  where image_asset_id is not null;

create index if not exists pipa_game_sessions_quiz_id_idx
  on public.pipa_game_sessions(quiz_id);

create index if not exists pipa_game_sessions_leaderboard_idx
  on public.pipa_game_sessions(quiz_id, score desc, elapsed_ms asc, started_at asc, id)
  where status = 'completed';

create index if not exists pipa_game_question_results_question_id_idx
  on public.pipa_game_question_results(question_id, quiz_id);

create index if not exists pipa_game_question_results_quiz_id_idx
  on public.pipa_game_question_results(quiz_id, question_id);

create index if not exists pipa_game_answer_options_question_option_idx
  on public.pipa_game_answer_options(question_id, option_id);

create index if not exists pipa_rsvps_quiz_status_idx
  on public.pipa_rsvps(quiz_id, status);

insert into public.pipa_quizzes (
  slug,
  title,
  event_date,
  event_time,
  event_timezone,
  venue_name,
  venue_address,
  venue_detail,
  map_url
)
values (
  'pipa-27-2026',
  'El reto de Pipa',
  date '2026-09-26',
  time '19:30',
  'America/Lima',
  'Zona Bar · Edificio Astromelia',
  'Av. Salaverry 1880',
  'La comida corre por la casa · Llevar trago',
  'https://www.google.com/maps/search/?api=1&query=Av.+Salaverry+1880+Edificio+Astromelia+Lima'
)
on conflict (slug) do nothing;

with quiz as (
  select id from public.pipa_quizzes where slug = 'pipa-27-2026'
), asset_data(asset_key, asset_kind, public_path, alt_text, mime_type) as (
  values
    ('invitation', 'invitation', '/invitacion-cumpleanos-pipa.png', 'Invitación del cumpleaños de Pipa', 'image/png'),
    ('question-1-option-a', 'option_image', '/imagenes/1A.webp', 'Mayonesa', 'image/webp'),
    ('question-1-option-b', 'option_image', '/imagenes/1B.webp', 'Golf', 'image/webp'),
    ('question-2-option-a', 'option_image', '/imagenes/2A.webp', 'Pollo a la brasa', 'image/webp'),
    ('question-2-option-b', 'option_image', '/imagenes/2B.webp', 'Lomo saltado', 'image/webp'),
    ('question-3', 'question_image', '/imagenes/3.webp', 'Mascotas de Pipa', 'image/webp'),
    ('question-4', 'question_image', '/imagenes/4.webp', 'Pregunta 4', 'image/webp'),
    ('question-5', 'question_image', '/imagenes/5.webp', 'Pregunta 5', 'image/webp'),
    ('question-6-option-a', 'option_image', '/imagenes/6A.webp', 'Revisar los bolsillos', 'image/webp'),
    ('question-6-option-b', 'option_image', '/imagenes/6B.webp', 'Responder que sí', 'image/webp'),
    ('question-7-option-a', 'option_image', '/imagenes/7A.webp', 'Olvidar algo en la mochila', 'image/webp'),
    ('question-7-option-b', 'option_image', '/imagenes/7B.webp', 'Olvidar la mochila', 'image/webp'),
    ('question-8', 'question_image', '/imagenes/8.webp', 'Pregunta 8', 'image/webp'),
    ('question-9-option-a', 'option_image', '/imagenes/9A.webp', 'Ojos abiertos', 'image/webp'),
    ('question-9-option-b', 'option_image', '/imagenes/9B.webp', 'Boca abierta', 'image/webp'),
    ('question-10-option-a', 'option_image', '/imagenes/10A.webp', 'Llaves dentro del carro', 'image/webp'),
    ('question-10-option-b', 'option_image', '/imagenes/10B.webp', 'Llaves en la mano', 'image/webp')
)
insert into public.pipa_assets (quiz_id, asset_key, asset_kind, public_path, alt_text, mime_type)
select quiz.id, asset_data.asset_key, asset_data.asset_kind, asset_data.public_path, asset_data.alt_text, asset_data.mime_type
from quiz
cross join asset_data
on conflict (quiz_id, asset_key) do nothing;

update public.pipa_quizzes quiz
set invitation_asset_id = asset.id
from public.pipa_assets asset
where quiz.slug = 'pipa-27-2026'
  and asset.quiz_id = quiz.id
  and asset.asset_key = 'invitation';

with quiz as (
  select id from public.pipa_quizzes where slug = 'pipa-27-2026'
), assets as (
  select asset_key, id from public.pipa_assets
  where quiz_id = (select id from quiz)
), question_data(position, prompt, kind, points_per_correct, max_selections, image_asset_key) as (
  values
    (1::smallint, 'Van a comer pollo a la brasa y solo pueden pedir una crema por persona ¿Qué crema escoge Pipa?', 'single', 10::smallint, 1::smallint, null::text),
    (2::smallint, 'Pipa va de viaje a otro país y se le antoja un plato peruano ¿Cuál es el que busca?', 'single', 10::smallint, 1::smallint, null::text),
    (3::smallint, 'Pipa tiene 3 mascotas, ¿Cómo se llaman 2 de ellas?', 'single', 10::smallint, 1::smallint, 'question-3'),
    (4::smallint, 'Van a pedir comida entre todos. ¿Qué opción preferiría Pipa?', 'single', 10::smallint, 1::smallint, 'question-4'),
    (5::smallint, 'Hay que elegir acompañamiento para la comida. ¿Qué escogería Pipa?', 'single', 10::smallint, 1::smallint, 'question-5'),
    (6::smallint, 'Todos salen de una casa y, 5 minutos después, alguien pregunta si tienen todo. ¿Qué pasa con Pipa?', 'single', 10::smallint, 1::smallint, null::text),
    (7::smallint, 'Pipa sale con mochila porque necesita llevar varias cosas. ¿Qué es más probable?', 'single', 10::smallint, 1::smallint, null::text),
    (8::smallint, 'Pipa está comiendo y todos los demás ya terminaron. ¿Qué está pasando?', 'single', 10::smallint, 1::smallint, 'question-8'),
    (9::smallint, 'Pipa está dormido y alguien quiere comprobar si realmente se durmió. ¿En qué se fija?', 'single', 10::smallint, 1::smallint, null::text),
    (10::smallint, 'Pipa está por salir, pero no encuentra las llaves del carro. ¿Cuál de estas opciones es más probable? (puedes marcar una o ambas)', 'multiple', 5::smallint, 2::smallint, null::text)
)
insert into public.pipa_questions (
  quiz_id,
  position,
  prompt,
  kind,
  points_per_correct,
  max_selections,
  image_asset_id
)
select
  quiz.id,
  question_data.position,
  question_data.prompt,
  question_data.kind::public.pipa_question_kind,
  question_data.points_per_correct,
  question_data.max_selections,
  assets.id
from quiz
cross join question_data
left join assets on assets.asset_key = question_data.image_asset_key
on conflict (quiz_id, position) do nothing;

with quiz as (
  select id from public.pipa_quizzes where slug = 'pipa-27-2026'
), questions as (
  select id, position from public.pipa_questions
  where quiz_id = (select id from quiz)
), assets as (
  select asset_key, id from public.pipa_assets
  where quiz_id = (select id from quiz)
), option_data(question_position, option_key, display_order, option_text, image_asset_key, is_correct) as (
  values
    (1::smallint, 'A', 1::smallint, 'Mayonesa', 'question-1-option-a', false),
    (1::smallint, 'B', 2::smallint, 'Golf', 'question-1-option-b', true),
    (2::smallint, 'A', 1::smallint, 'Pollo a la brasa', 'question-2-option-a', false),
    (2::smallint, 'B', 2::smallint, 'Lomo Saltado', 'question-2-option-b', true),
    (3::smallint, 'A', 1::smallint, 'Wau Wau y Miau', null::text, false),
    (3::smallint, 'B', 2::smallint, 'Michi y Rocky', null::text, true),
    (4::smallint, 'A', 1::smallint, 'Un lugar donde sabe que hay algo que le gusta', null::text, true),
    (4::smallint, 'B', 2::smallint, 'Un lugar nuevo aunque no haya probado nada', null::text, false),
    (5::smallint, 'A', 1::smallint, 'Camote frito', null::text, false),
    (5::smallint, 'B', 2::smallint, 'Papas fritas', null::text, true),
    (6::smallint, 'A', 1::smallint, 'Revisa sus bolsillos por si acaso', 'question-6-option-a', false),
    (6::smallint, 'B', 2::smallint, 'Responde que sí sin revisar demasiado', 'question-6-option-b', true),
    (7::smallint, 'A', 1::smallint, 'Que se olvide de meter algo en la mochila', 'question-7-option-a', false),
    (7::smallint, 'B', 2::smallint, 'Que se olvide la mochila', 'question-7-option-b', true),
    (8::smallint, 'A', 1::smallint, 'Pidió más comida', null::text, false),
    (8::smallint, 'B', 2::smallint, 'Se olvidó que estaba comiendo', null::text, true),
    (9::smallint, 'A', 1::smallint, 'En si tiene los ojos abiertos', 'question-9-option-a', true),
    (9::smallint, 'B', 2::smallint, 'En si tiene la boca abierta', 'question-9-option-b', false),
    (10::smallint, 'A', 1::smallint, 'Están dentro del carro', 'question-10-option-a', true),
    (10::smallint, 'B', 2::smallint, 'Las tiene en la mano', 'question-10-option-b', true)
)
insert into public.pipa_options (
  quiz_id,
  question_id,
  option_key,
  display_order,
  option_text,
  image_asset_id,
  is_correct
)
select
  quiz.id,
  questions.id,
  option_data.option_key,
  option_data.display_order,
  option_data.option_text,
  assets.id,
  option_data.is_correct
from quiz
cross join option_data
join questions on questions.position = option_data.question_position
left join assets on assets.asset_key = option_data.image_asset_key
on conflict (question_id, option_key) do nothing;

create or replace view public.pipa_leaderboard
with (security_invoker = true)
as
select
  session.quiz_id,
  session.id as session_id,
  session.player_name,
  session.score,
  session.elapsed_ms,
  session.completed_at,
  row_number() over (
    partition by session.quiz_id
    order by session.score desc, session.elapsed_ms asc, session.started_at asc, session.id
  ) as rank_position
from public.pipa_game_sessions session
where session.status = 'completed';

create or replace view public.pipa_question_stats
with (security_invoker = true)
as
with completed_results as (
  select result.*
  from public.pipa_game_question_results result
  join public.pipa_game_sessions session
    on session.id = result.session_id
    and session.quiz_id = result.quiz_id
  where session.status = 'completed'
)
select
  question.quiz_id,
  question.id as question_id,
  question.position,
  count(result.session_id) as attempts,
  count(result.session_id) filter (where result.is_fully_correct) as fully_correct,
  count(result.session_id) filter (where not result.is_fully_correct) as not_fully_correct,
  coalesce(
    round(
      100.0 * count(result.session_id) filter (where result.is_fully_correct)
      / nullif(count(result.session_id), 0),
      2
    ),
    0
  ) as accuracy_percentage
from public.pipa_questions question
left join completed_results result on result.question_id = question.id
group by question.quiz_id, question.id, question.position;

create or replace view public.pipa_quiz_stats
with (security_invoker = true)
as
with session_counts as (
  select
    quiz_id,
    count(*) as sessions_started,
    count(*) filter (where status = 'completed') as sessions_completed,
    count(*) filter (where status = 'started') as sessions_in_progress,
    round(avg(score) filter (where status = 'completed'), 2) as average_score,
    round(avg(elapsed_ms) filter (where status = 'completed'), 2) as average_elapsed_ms
  from public.pipa_game_sessions
  group by quiz_id
), rsvp_counts as (
  select
    quiz_id,
    count(*) filter (where status = 'yes') as rsvps_yes,
    count(*) filter (where status = 'maybe') as rsvps_maybe,
    count(*) filter (where status = 'no') as rsvps_no
  from public.pipa_rsvps
  group by quiz_id
)
select
  quiz.id as quiz_id,
  coalesce(session_counts.sessions_started, 0) as sessions_started,
  coalesce(session_counts.sessions_completed, 0) as sessions_completed,
  coalesce(session_counts.sessions_in_progress, 0) as sessions_in_progress,
  coalesce(session_counts.average_score, 0) as average_score,
  coalesce(session_counts.average_elapsed_ms, 0) as average_elapsed_ms,
  coalesce(rsvp_counts.rsvps_yes, 0) as rsvps_yes,
  coalesce(rsvp_counts.rsvps_maybe, 0) as rsvps_maybe,
  coalesce(rsvp_counts.rsvps_no, 0) as rsvps_no
from public.pipa_quizzes quiz
left join session_counts on session_counts.quiz_id = quiz.id
left join rsvp_counts on rsvp_counts.quiz_id = quiz.id;

alter table public.pipa_quizzes enable row level security;
alter table public.pipa_assets enable row level security;
alter table public.pipa_questions enable row level security;
alter table public.pipa_options enable row level security;
alter table public.pipa_game_sessions enable row level security;
alter table public.pipa_game_question_results enable row level security;
alter table public.pipa_game_answer_options enable row level security;
alter table public.pipa_rsvps enable row level security;

revoke all on table
  public.pipa_quizzes,
  public.pipa_assets,
  public.pipa_questions,
  public.pipa_options,
  public.pipa_game_sessions,
  public.pipa_game_question_results,
  public.pipa_game_answer_options,
  public.pipa_rsvps,
  public.pipa_leaderboard,
  public.pipa_question_stats,
  public.pipa_quiz_stats
from public, anon, authenticated;

revoke all on sequence
  public.pipa_questions_id_seq,
  public.pipa_options_id_seq
from public, anon, authenticated;

grant usage on schema public to service_role;
grant select on table
  public.pipa_quizzes,
  public.pipa_assets,
  public.pipa_questions,
  public.pipa_options,
  public.pipa_leaderboard,
  public.pipa_question_stats,
  public.pipa_quiz_stats
to service_role;

grant select, insert, update on table
  public.pipa_game_sessions,
  public.pipa_game_question_results,
  public.pipa_game_answer_options,
  public.pipa_rsvps
to service_role;

grant usage, select on sequence
  public.pipa_questions_id_seq,
  public.pipa_options_id_seq
to service_role;
