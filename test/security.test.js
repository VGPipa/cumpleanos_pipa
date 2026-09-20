import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWriteToken,
  hashWriteToken,
  normalizeDni,
  normalizeGuestFullName,
  normalizePlayerName,
  normalizeQuestionPosition,
  normalizeRsvp,
  normalizeSelections,
  requireSession
} from '../api/_lib/security.js';
import { calculateQuestionScore } from '../api/_lib/scoring.js';
import { buildProgressPayload } from '../api/_lib/progress.js';

test('creates an opaque token and stores only a sha256 hash', () => {
  const token = createWriteToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(hashWriteToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashWriteToken(token), token);
});

test('normalizes names without changing visible wording', () => {
  assert.equal(normalizePlayerName('  Ana   María  '), 'Ana María');
  assert.throws(() => normalizePlayerName('   '));
  assert.throws(() => normalizePlayerName('a'.repeat(61)));
});

test('validates session identity and question answers', () => {
  const token = createWriteToken();
  const session = requireSession({
    id: '0f0f1b1c-2222-4333-8444-555555555555',
    token
  });
  assert.equal(session.id, '0f0f1b1c-2222-4333-8444-555555555555');
  assert.equal(session.tokenHash, hashWriteToken(token));
  assert.equal(normalizeQuestionPosition(10), 10);
  assert.deepEqual(normalizeSelections(['a', 'B']), ['A', 'B']);
  assert.throws(() => normalizeSelections(['A', 'A']));
});

test('maps only yes and no RSVP values and validates confirmed guest identity', () => {
  assert.equal(normalizeRsvp('Sí'), 'yes');
  assert.equal(normalizeRsvp('No'), 'no');
  assert.throws(() => normalizeRsvp('Tal vez'));
  assert.throws(() => normalizeRsvp('Quizás'));
  assert.equal(normalizeGuestFullName('  Victor   Grados  '), 'Victor Grados');
  assert.throws(() => normalizeGuestFullName('Victor'));
  assert.equal(normalizeDni('12345678'), '12345678');
  assert.throws(() => normalizeDni('1234'));
});

test('awards full, partial, or zero points according to selection overlap', () => {
  assert.equal(calculateQuestionScore(['B'], ['B']), 10);
  assert.equal(calculateQuestionScore(['A', 'B'], ['B']), 5);
  assert.equal(calculateQuestionScore(['A'], ['B']), 0);
  assert.equal(calculateQuestionScore(['A'], ['A', 'B']), 5);
  assert.equal(calculateQuestionScore(['A', 'B'], ['A', 'B']), 10);
});

test('builds a resumable progress payload without exposing answers or tokens', () => {
  const session = {
    player_name: 'Ana María',
    status: 'started',
    score: null,
    elapsed_ms: null,
    started_at: '2026-09-20T01:00:00.000Z',
    write_token_hash: 'should-never-leave-the-server'
  };
  const payload = buildProgressPayload(session, [{points_awarded: 10}, {points_awarded: 5}], null, Date.parse('2026-09-20T01:00:30.000Z'));
  assert.deepEqual(payload, {
    nombre: 'Ana María',
    estado: 'started',
    respuestas: 2,
    puntaje: 15,
    tiempo: null,
    transcurrido: 30_000,
    asistencia: null
  });
  assert.equal('write_token_hash' in payload, false);
});
