import { handleError, json, readJson, RequestError } from './_lib/http.js';
import { normalizeDni, normalizeGuestFullName, normalizeRsvp, requireSession } from './_lib/security.js';
import { getSupabase } from './_lib/supabase.js';

function mapDatabaseError(error) {
  if (error?.code !== 'P0001') return error;
  const message = error.message || '';
  if (message.includes('no encontrada')) return new RequestError('Sesión no encontrada', 404);
  return new RequestError(message || 'Completa el cuestionario primero', 409);
}

export async function POST(request) {
  try {
    const body = await readJson(request);
    const session = requireSession(body);
    const status = normalizeRsvp(body.asistencia);
    const fullName = status === 'yes' ? normalizeGuestFullName(body.nombreCompleto) : null;
    const dni = status === 'yes' ? normalizeDni(body.dni) : null;

    const { error } = await getSupabase().rpc('pipa_submit_rsvp_with_identity', {
      p_dni: dni,
      p_full_name: fullName,
      p_session_id: session.id,
      p_status: status,
      p_write_token_hash: session.tokenHash
    });

    if (error) throw mapDatabaseError(error);
    return json({ ok: true });
  } catch (error) {
    return handleError(error, 'api/asistencia');
  }
}
