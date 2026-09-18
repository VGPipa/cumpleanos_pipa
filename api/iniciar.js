import { handleError, json, readJson, RequestError } from './_lib/http.js';
import { createWriteToken, hashWriteToken, normalizePlayerName } from './_lib/security.js';
import { getQuizSlug, getSupabase } from './_lib/supabase.js';

export async function POST(request) {
  try {
    const body = await readJson(request);
    const playerName = normalizePlayerName(body.nombre);
    const supabase = getSupabase();

    const { data: quiz, error: quizError } = await supabase
      .from('pipa_quizzes')
      .select('id')
      .eq('slug', getQuizSlug())
      .eq('is_active', true)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) throw new RequestError('El reto no está disponible', 503);

    const token = createWriteToken();
    const { data: session, error: sessionError } = await supabase
      .from('pipa_game_sessions')
      .insert({
        quiz_id: quiz.id,
        player_name: playerName,
        write_token_hash: hashWriteToken(token)
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;
    return json({ id: session.id, token }, 201);
  } catch (error) {
    return handleError(error, 'api/iniciar');
  }
}
