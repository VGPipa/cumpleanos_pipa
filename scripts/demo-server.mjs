import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { calculateQuestionScore } from '../api/_lib/scoring.js';

const port = Number(process.env.DEMO_PORT || 3001);
const publicRoot = resolve(new URL('../public/', import.meta.url).pathname);
const sessions = new Map();
const answerKeys = {
  1: ['B'], 2: ['B'], 3: ['B'], 4: ['A'], 5: ['B'],
  6: ['B'], 7: ['B'], 8: ['B'], 9: ['A'], 10: ['A', 'B']
};
const mimeTypes = {'.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp'};

function json(response, status, body) {
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('Solicitud demasiado grande');
  }
  return JSON.parse(raw || '{}');
}

function sameSelection(selected, answer) {
  return selected.length === answer.length && selected.every(key => answer.includes(key));
}

function requireSession(body) {
  const session = sessions.get(body.id);
  if (!session || session.token !== body.token) throw new Error('Sesión no encontrada');
  return session;
}

async function serveFile(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filePath = resolve(publicRoot, requestedPath === '/' ? 'index.html' : `.${requestedPath}`);
  if (!relative(publicRoot, filePath) || relative(publicRoot, filePath).startsWith('..')) return json(response, 404, {error: 'No encontrado'});
  try {
    if (!(await stat(filePath)).isFile()) return json(response, 404, {error: 'No encontrado'});
    response.writeHead(200, {'Content-Type': `${mimeTypes[extname(filePath)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store'});
    response.end(await readFile(filePath));
  } catch {
    json(response, 404, {error: 'No encontrado'});
  }
}

const server = createServer(async (request, response) => {
  try {
    const {pathname} = new URL(request.url, 'http://localhost');
    if (!pathname.startsWith('/api/')) return serveFile(request, response);
    if (request.method === 'GET' && pathname === '/api/ranking') {
      const ranking = [...sessions.values()]
        .filter(session => session.completed)
        .sort((a, b) => b.score - a.score || a.elapsed - b.elapsed)
        .map(({id, name, score, elapsed}) => ({id, nombre: name, puntaje: score, tiempo: elapsed}));
      return json(response, 200, ranking);
    }
    if (request.method !== 'POST') return json(response, 405, {error: 'Método no permitido'});

    const body = await readBody(request);
    if (pathname === '/api/iniciar') {
      const name = String(body.nombre || '').trim().replace(/\s+/g, ' ');
      if (!name || name.length > 60) return json(response, 400, {error: 'Nombre inválido'});
      const id = randomUUID();
      const token = randomBytes(24).toString('base64url');
      sessions.set(id, {id, token, name, answers: [], score: 0, startedAt: Date.now(), completed: false});
      return json(response, 201, {id, token});
    }

    const session = requireSession(body);
    if (pathname === '/api/responder') {
      const position = Number(body.pregunta);
      const selected = [...new Set((Array.isArray(body.respuestas) ? body.respuestas : []).map(value => String(value).toUpperCase()))];
      if (position !== session.answers.length + 1 || !answerKeys[position] || selected.length < 1 || selected.length > 2 || selected.some(key => !['A', 'B'].includes(key))) {
        return json(response, 400, {error: 'Respuesta inválida'});
      }
      const correctas = answerKeys[position];
      const aciertoCompleto = sameSelection(selected, correctas);
      const puntos = calculateQuestionScore(selected, correctas);
      session.answers.push(selected);
      session.score += puntos;
      const finalizado = position === 10;
      const tiempo = finalizado ? Date.now() - session.startedAt : null;
      if (finalizado) Object.assign(session, {completed: true, elapsed: tiempo});
      return json(response, 200, {puntos, correctas, acierto_completo: aciertoCompleto, puntaje_total: session.score, finalizado, tiempo});
    }

    if (pathname === '/api/asistencia') {
      if (!session.completed || !['Sí', 'No'].includes(body.asistencia)) return json(response, 400, {error: 'Asistencia inválida'});
      if (body.asistencia === 'Sí') {
        const nombreCompleto = String(body.nombreCompleto || '').trim().replace(/\s+/g, ' ');
        const dni = String(body.dni || '').trim();
        if (nombreCompleto.length < 3 || nombreCompleto.length > 120 || nombreCompleto.split(' ').length < 2) {
          return json(response, 400, {error: 'Escribe tu nombre completo'});
        }
        if (!/^\d{8}$/.test(dni)) return json(response, 400, {error: 'El DNI debe tener 8 dígitos'});
        session.nombreCompleto = nombreCompleto;
        session.dni = dni;
      }
      session.asistencia = body.asistencia;
      return json(response, 200, {});
    }
    return json(response, 404, {error: 'No encontrado'});
  } catch (error) {
    return json(response, 400, {error: error.message || 'Solicitud inválida'});
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Demo local en http://127.0.0.1:${port}`);
});
