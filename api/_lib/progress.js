const MAX_ELAPSED_MS = 86_400_000;

export function buildProgressPayload(session, results = [], rsvpStatus = null, now = Date.now()) {
  const startedAt = Date.parse(session.started_at);
  const liveElapsed = Number.isFinite(startedAt) ? now - startedAt : 0;
  const elapsed = session.status === 'completed'
    ? session.elapsed_ms
    : Math.min(MAX_ELAPSED_MS, Math.max(0, liveElapsed));
  const partialScore = results.reduce((total, result) => total + Number(result.points_awarded || 0), 0);

  return {
    nombre: session.player_name,
    estado: session.status,
    respuestas: results.length,
    puntaje: session.status === 'completed' ? session.score : partialScore,
    tiempo: session.status === 'completed' ? session.elapsed_ms : null,
    transcurrido: elapsed,
    asistencia: rsvpStatus || null
  };
}
