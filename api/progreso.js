import { handleError, json, readJson, RequestError } from './_lib/http.js';
import { buildProgressPayload } from './_lib/progress.js';
import { requireSession } from './_lib/security.js';
import { getSupabase } from './_lib/supabase.js';

export async function POST(request) {
  try {
    const body = await readJson(request);
    const identity = requireSession(body);
    const supabase = getSupabase();

    const { data: session, error: sessionError } = await supabase
      .from('pipa_game_sessions')
      .select('id,player_name,status,score,elapsed_ms,started_at')
      .eq('id', identity.id)
      .eq('write_token_hash', identity.tokenHash)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw new RequestError('Sesión no encontrada', 404);

    const [resultsResponse, rsvpResponse] = await Promise.all([
      supabase
        .from('pipa_game_question_results')
        .select('points_awarded')
        .eq('session_id', session.id),
      supabase
        .from('pipa_rsvps')
        .select('status')
        .eq('session_id', session.id)
        .maybeSingle()
    ]);

    if (resultsResponse.error) throw resultsResponse.error;
    if (rsvpResponse.error) throw rsvpResponse.error;

    return json(buildProgressPayload(
      session,
      resultsResponse.data || [],
      rsvpResponse.data?.status || null
    ));
  } catch (error) {
    return handleError(error, 'api/progreso');
  }
}
