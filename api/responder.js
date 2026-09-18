import { handleError, json, readJson, RequestError } from './_lib/http.js';
import { normalizeQuestionPosition, normalizeSelections, requireSession } from './_lib/security.js';
import { getSupabase } from './_lib/supabase.js';

function mapDatabaseError(error) {
  if (error?.code !== 'P0001') return error;
  const message = error.message || '';
  if (message.includes('no encontrada')) return new RequestError('Sesión no encontrada', 404);
  if (message.includes('completada') || message.includes('orden')) return new RequestError(message, 409);
  return new RequestError(message || 'Respuesta inválida');
}

export async function POST(request) {
  try {
    const body = await readJson(request);
    const session = requireSession(body);
    const questionPosition = normalizeQuestionPosition(body.pregunta);
    const selections = normalizeSelections(body.respuestas);

    const { data, error } = await getSupabase().rpc('pipa_submit_answer', {
      p_question_position: questionPosition,
      p_selected_option_keys: selections,
      p_session_id: session.id,
      p_write_token_hash: session.tokenHash
    });

    if (error) throw mapDatabaseError(error);
    return json(data);
  } catch (error) {
    return handleError(error, 'api/responder');
  }
}
