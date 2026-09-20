import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public frontend contains no answer key', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /correctas\s*:/);
  assert.match(app, /api\('responder'/);
});

test('the start screen avoids a second oversized visual card and scattered decorations', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /class="invitacion-hero"|class="hero-ilustracion"|class="sticker/);
  assert.match(html, /class="skip-link" href="#contenido-principal"/);
  assert.match(html, /name="nombre"/);
});

test('the final invitation uses a consistent visual language and its entrance respects the design system', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /🏆|🥳|🤔|🥲|📅|📍|🍹|✨|⬇|⌖/);
  assert.match(css, /@keyframes invitacion-sube/);
  assert.match(css, /@keyframes resultado-baja/);
  assert.match(css, /@keyframes resultado-llega-ticket/);
  assert.match(css, /\.final-card\.final-invitacion-protagonista\{[\s\S]*background(?:-color)?:transparent/);
  assert.match(html, /class="invitacion-resultado"/);
  assert.match(html, /id="ranking-previo-lista"/);
  assert.match(html, /class="edad-sello" aria-label="Mis 27 años"><strong>27<\/strong><small>AÑOS<\/small>/);
  assert.match(app, /\['🏆', '🥈', '🥉'\]/);
  assert.match(css, /\.ranking-premio/);
  assert.match(html, /href="\.\/invitacion-cumpleanos-pipa-v2\.png" download="invitacion-cumpleanos-pipa\.png"/);
});

test('question changes and the final invitation follow a deliberate motion sequence', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /avanzandoPregunta/);
  assert.match(app, /final-puntaje-compacto/);
  assert.match(app, /final-asistencia-lista/);
  assert.match(css, /@keyframes pregunta-entra/);
  assert.match(css, /@keyframes pregunta-sale/);
  assert.match(css, /@keyframes puntaje-aparece/);
  assert.match(css, /@keyframes resultado-sello-aparece/);
  assert.match(css, /transition:font-size \.86s/);
  assert.doesNotMatch(css, /\.asistencia-card\{[^}]*border-top/);
});

test('the full ranking opens and closes with the same smooth motion language', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /function cerrarRanking\(\)/);
  assert.match(app, /classList\.add\('cerrando'\)/);
  assert.match(app, /addEventListener\('cancel'/);
  assert.match(css, /@keyframes ranking-entra/);
  assert.match(css, /@keyframes ranking-sale/);
  assert.match(css, /@keyframes ranking-fondo-entra/);
});

test('all questions share the same selectable-card interaction', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /Puedes marcar una o más opciones/);
  assert.match(app, /type="checkbox"/);
  assert.match(app, /id="btn-confirmar-seleccion"/);
  assert.doesNotMatch(app, /id="btn-siguiente"/);
  assert.doesNotMatch(app, /<strong>Bien<\/strong>|<strong>Mal<\/strong>/);
  assert.match(app, /class="recompensa-puntos"/);
  assert.match(app, /puntos === 1 \? 'punto' : 'puntos'/);
  assert.match(app, /Era la/);
  assert.match(app, /Eran \$\{correctas/);
  assert.match(app, /class="feedback-explicacion"/);
  assert.match(app, /setTimeout\(resolve, 1500\)/);
  assert.match(app, /width="\$\{ancho\}" height="\$\{alto\}" decoding="async"/);
  assert.doesNotMatch(app, /pregunta\.tipo === 'multiple'/);
});

test('RSVP collects identity only for confirmed guests and removes the maybe option', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260919140000_collect_confirmed_guest_identity.sql', import.meta.url), 'utf8');
  assert.match(html, /id="input-nombre-completo"/);
  assert.match(html, /id="input-dni"/);
  assert.doesNotMatch(html, /data-asistencia="Tal vez"/);
  assert.doesNotMatch(html, /id="puntaje-mensaje"|id="estado-guardado"/);
  assert.match(app, /pipa|nombreCompleto/);
  assert.match(app, /No pudimos guardar tu respuesta\. Revisa la conexión/);
  assert.match(migration, /full_name text/);
  assert.match(migration, /dni ~ '\^\[0-9\]\{8\}\$'/);
  assert.match(migration, /status <> 'yes' and full_name is null and dni is null/);
  assert.match(migration, /status = 'yes'/);
  assert.match(migration, /pipa_submit_rsvp_with_identity/);
});

test('a started game cannot be reset from the client controls', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /if \(sesion \|\| nombreJugador\) return;/);
  assert.match(css, /\.partida-iniciada #btn-reset\{display:none\}/);
  assert.match(css, /\.partida-iniciada \[data-rehacer\]/);
  assert.match(css, /input:focus-visible\{outline-color:var\(--lila\)\}/);
});

test('public frontend cannot activate a localhost answer-key preview', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /MODO_DEMO_LOCAL|solo-demo-local|apiDemo/);
});

test('database scoring awards full points for exact answers and half for partial overlap', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260919100000_make_all_questions_multi_select.sql', import.meta.url), 'utf8');
  const partialCreditMigration = await readFile(new URL('../supabase/migrations/20260919150000_add_partial_credit_scoring.sql', import.meta.url), 'utf8');
  assert.match(migration, /max_selections = 2/);
  assert.match(partialCreditMigration, /when fully_correct then question_total_points/);
  assert.match(partialCreditMigration, /when correct_selected > 0 then round\(question_total_points \/ 2\.0\)/);
});

test('static assets and APIs use paths compatible with a proxy subdirectory', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/);
  assert.doesNotMatch(app, /(?:fetch|api)\(['"]\/api\//);
  assert.match(app, /fetch\(`\.\/api\//);
  assert.match(app, /src="\.\/imagenes\//);
});
