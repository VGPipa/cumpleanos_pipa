import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public frontend contains no answer key', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /correctas\s*:/);
  assert.match(app, /api\('responder'/);
});

test('static assets and APIs use paths compatible with a proxy subdirectory', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/);
  assert.doesNotMatch(app, /(?:fetch|api)\(['"]\/api\//);
  assert.match(app, /fetch\(`\.\/api\//);
  assert.match(app, /src="\.\/imagenes\//);
});
