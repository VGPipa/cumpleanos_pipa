import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWriteToken,
  hashWriteToken,
  normalizePlayerName,
  normalizeQuestionPosition,
  normalizeRsvp,
  normalizeSelections,
  requireSession
} from '../api/_lib/security.js';

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

test('maps only the three supported RSVP values', () => {
  assert.equal(normalizeRsvp('Sí'), 'yes');
  assert.equal(normalizeRsvp('Tal vez'), 'maybe');
  assert.equal(normalizeRsvp('No'), 'no');
  assert.throws(() => normalizeRsvp('Quizás'));
});
