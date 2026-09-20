update public.pipa_quizzes
set venue_name = 'Sala de juegos y bar · Edificio Astromelia'
where slug = 'pipa-27-2026'
  and venue_name is distinct from 'Sala de juegos y bar · Edificio Astromelia';
