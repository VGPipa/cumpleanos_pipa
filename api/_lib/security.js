import { createHash, randomBytes } from 'node:crypto';
import { RequestError } from './http.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;
const OPTION_PATTERN = /^[A-Z0-9_-]{1,12}$/;

export function createWriteToken() {
  return randomBytes(32).toString('base64url');
}

export function hashWriteToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function requireSession(body) {
  const id = typeof body.id === 'string' ? body.id : '';
  const token = typeof body.token === 'string' ? body.token : '';
  if (!UUID_PATTERN.test(id) || !TOKEN_PATTERN.test(token)) {
    throw new RequestError('Sesión inválida');
  }
  return { id, tokenHash: hashWriteToken(token) };
}

export function normalizePlayerName(value) {
  if (typeof value !== 'string') throw new RequestError('Nombre inválido');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || [...name].length > 60) throw new RequestError('Nombre inválido');
  return name;
}

export function normalizeQuestionPosition(value) {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new RequestError('Pregunta inválida');
  }
  return value;
}

export function normalizeSelections(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new RequestError('Respuesta inválida');
  }
  const selections = value.map(item => typeof item === 'string' ? item.trim().toUpperCase() : '');
  if (selections.some(item => !OPTION_PATTERN.test(item)) || new Set(selections).size !== selections.length) {
    throw new RequestError('Respuesta inválida');
  }
  return selections;
}

export function normalizeRsvp(value) {
  const statuses = new Map([
    ['Sí', 'yes'],
    ['Tal vez', 'maybe'],
    ['No', 'no']
  ]);
  const status = statuses.get(value);
  if (!status) throw new RequestError('Asistencia inválida');
  return status;
}
