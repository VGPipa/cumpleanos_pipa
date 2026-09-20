
// ==========================================
// DATOS DE LAS PREGUNTAS
// ==========================================
// Fotos de cada pregunta y opción, disponibles en public/imagenes/.

const preguntas = [
  {
    texto: "1. Van a comer pollo a la brasa y solo pueden pedir una crema por persona ¿Qué crema escoge Pipa?",
    imagenPregunta: null,
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Mayonesa", imagen: "1A.webp" },
      { letra: "B", texto: "Golf", imagen: "1B.webp" }
    ]
  },
  {
    texto: "2. Pipa va de viaje a otro país y se le antoja un plato peruano ¿Cuál es el que busca?",
    imagenPregunta: null,
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Pollo a la brasa", imagen: "2A.webp" },
      { letra: "B", texto: "Lomo Saltado", imagen: "2B.webp" }
    ]
  },
  {
    texto: "3. Pipa tiene 3 mascotas, ¿Cómo se llaman 2 de ellas?",
    imagenPregunta: "3.webp",
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Wau Wau y Miau", imagen: null },
      { letra: "B", texto: "Michi y Rocky", imagen: null }
    ]
  },
  {
    texto: "4. Van a pedir comida entre todos. ¿Qué opción preferiría Pipa?",
    imagenPregunta: "4.webp",
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Un lugar donde sabe que hay algo que le gusta", imagen: null },
      { letra: "B", texto: "Un lugar nuevo aunque no haya probado nada", imagen: null }
    ]
  },
  {
    texto: "5. Hay que elegir acompañamiento para la comida. ¿Qué escogería Pipa?",
    imagenPregunta: "5.webp",
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Camote frito", imagen: null },
      { letra: "B", texto: "Papas fritas", imagen: null }
    ]
  },
  {
    texto: "6. Todos salen de una casa y, 5 minutos después, alguien pregunta si tienen todo. ¿Qué pasa con Pipa?",
    imagenPregunta: null,
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Revisa sus bolsillos por si acaso", imagen: "6A.webp" },
      { letra: "B", texto: "Responde que sí sin revisar demasiado", imagen: "6B.webp" }
    ]
  },
  {
    texto: "7. Pipa sale con mochila porque necesita llevar varias cosas. ¿Qué es más probable?",
    imagenPregunta: null,
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Que se olvide de meter algo en la mochila", imagen: "7A.webp" },
      { letra: "B", texto: "Que se olvide la mochila", imagen: "7B.webp" }
    ]
  },
  {
    texto: "8. Pipa está comiendo y todos los demás ya terminaron. ¿Qué está pasando?",
    imagenPregunta: "8.webp",
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "Pidió más comida", imagen: null },
      { letra: "B", texto: "Se olvidó que estaba comiendo", imagen: null }
    ]
  },
  {
    texto: "9. Pipa está dormido y alguien quiere comprobar si realmente se durmió. ¿En qué se fija?",
    imagenPregunta: null,
    tipo: "unica",
    opciones: [
      { letra: "A", texto: "En si tiene los ojos abiertos", imagen: "9A.webp" },
      { letra: "B", texto: "En si tiene la boca abierta", imagen: "9B.webp" }
    ]
  },
  {
    texto: "10. Pipa está por salir, pero no encuentra las llaves del carro. ¿Cuál de estas opciones es más probable? (puedes marcar una o ambas)",
    imagenPregunta: null,
    tipo: "multiple",
    opciones: [
      { letra: "A", texto: "Están dentro del carro", imagen: "10A.webp" },
      { letra: "B", texto: "Las tiene en la mano", imagen: "10B.webp" }
    ]
  }
];

const PUNTOS_POR_PREGUNTA = 10;
const CLAVE_SESION_LOCAL = 'pipa-quiz-session-v1';
let sesion = null;
let tokenSesion = null;
let inicio = 0;
let tiempoFinal = 0;
let reloj = null;
let respondida = false;
let guardado = Promise.resolve();
let indiceActual = 0;
let puntajeTotal = 0;
let nombreJugador = "";
let avanzandoPregunta = false;
let temporizadoresFinales = [];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pantallas = $$('.pantalla');
const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// La primera carga muestra el estado inicial del reto.
mostrarPantalla('#pantalla-inicio');

function mostrarPantalla(selector) {
  const partidaIniciada = Boolean(nombreJugador);
  document.body.classList.toggle('en-inicio', selector === '#pantalla-inicio');
  document.body.classList.toggle('en-preguntas', selector === '#pantalla-preguntas');
  document.body.classList.toggle('partida-iniciada', partidaIniciada);
  $('.marca').setAttribute('aria-disabled', String(partidaIniciada));
  $('.marca').tabIndex = partidaIniciada ? -1 : 0;
  pantallas.forEach(pantalla => pantalla.classList.remove('activa'));
  $(selector).classList.add('activa');
  window.scrollTo({top: 0, behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth'});
}

function formatoTiempo(ms) {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

async function api(endpoint, body) {
  const opciones = body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {};
  const respuesta = await fetch(`./api/${endpoint}`, opciones);
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Error de conexión');
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

function leerSesionLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLAVE_SESION_LOCAL));
    if (!saved || typeof saved.id !== 'string' || typeof saved.token !== 'string' || typeof saved.nombre !== 'string') return null;
    return saved;
  } catch {
    return null;
  }
}

function guardarSesionLocal() {
  try {
    localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify({id: sesion, token: tokenSesion, nombre: nombreJugador}));
  } catch {
    // La partida continúa aunque el navegador no permita almacenamiento local.
  }
}

function borrarSesionLocal() {
  try {
    localStorage.removeItem(CLAVE_SESION_LOCAL);
  } catch {
    // No hay nada más que limpiar si el almacenamiento está bloqueado.
  }
}

function iniciarReloj(transcurrido = 0) {
  clearInterval(reloj);
  inicio = Date.now() - Math.max(0, transcurrido);
  const actualizar = () => { $('#cronometro').textContent = formatoTiempo(Date.now() - inicio); };
  actualizar();
  reloj = setInterval(actualizar, 250);
}

function limpiarEstado({conservarNombre = false} = {}) {
  clearInterval(reloj);
  reloj = null;
  sesion = null;
  tokenSesion = null;
  inicio = 0;
  tiempoFinal = 0;
  respondida = false;
  avanzandoPregunta = false;
  temporizadoresFinales.forEach(clearTimeout);
  temporizadoresFinales = [];
  guardado = Promise.resolve();
  indiceActual = 0;
  puntajeTotal = 0;
  if (!conservarNombre) {
    nombreJugador = '';
    $('#input-nombre').value = '';
  }
  $('#btn-comenzar').disabled = false;
  $('#cronometro').textContent = '00:00';
  $('#texto-puntaje').textContent = '0 pts';
  $('#barra-relleno').style.width = '10%';
  $('#confirmacion-final').style.display = 'none';
  $('#confirmacion-final').classList.remove('error');
  $('#confirmacion-final').textContent = '';
  $('#detalles-evento').classList.remove('visible');
  $('#pantalla-final').classList.remove('final-secuencia', 'final-puntaje-compacto', 'final-asistencia-lista', 'final-invitacion-protagonista');
  $('#btn-rehacer-solo').classList.remove('visible');
  $('#bloque-asistencia').style.display = '';
  $('#form-identidad').hidden = true;
  $('#form-identidad').classList.remove('visible');
  $('#input-nombre-completo').value = '';
  $('#input-dni').value = '';
  $('#error-identidad').textContent = '';
  $('#ranking-previo-lista').innerHTML = '<li class="ranking-cargando">Actualizando posiciones…</li>';
  $$('.btn-asistencia').forEach(boton => { boton.classList.remove('activo'); boton.disabled = false; });
}

function resetear() {
  if (sesion || nombreJugador) return;
  const nombreAnterior = nombreJugador || $('#input-nombre').value.trim();
  limpiarEstado({conservarNombre: true});
  nombreJugador = nombreAnterior;
  $('#input-nombre').value = nombreAnterior;
  mostrarPantalla('#pantalla-inicio');
  $('#input-nombre').focus();
}

$('#form-inicio').addEventListener('submit', async evento => {
  evento.preventDefault();
  const input = $('#input-nombre');
  const nombre = input.value.trim();
  if (!nombre) {
    input.classList.add('invalido');
    $('#error-nombre').textContent = 'Escribe tu nombre para comenzar.';
    input.focus();
    return;
  }
  $('#btn-comenzar').disabled = true;
  $('#error-nombre').textContent = '';
  try {
    const partida = await api('iniciar', {nombre});
    sesion = partida.id;
    tokenSesion = partida.token;
  } catch (error) {
    $('#error-nombre').textContent = 'No pudimos iniciar. Revisa la conexión e inténtalo otra vez.';
    $('#btn-comenzar').disabled = false;
    return;
  }
  nombreJugador = nombre;
  guardarSesionLocal();
  iniciarReloj();
  mostrarPantalla('#pantalla-preguntas');
  renderizarPregunta();
});

$('#input-nombre').addEventListener('input', evento => {
  evento.target.classList.remove('invalido');
  $('#error-nombre').textContent = '';
});

const dimensionesImagenes = {
  '1A.webp': [960, 720], '1B.webp': [960, 720],
  '2A.webp': [768, 960], '2B.webp': [768, 960],
  '3.webp': [720, 960], '4.webp': [720, 960], '5.webp': [960, 877],
  '6A.webp': [768, 960], '6B.webp': [768, 960],
  '7A.webp': [720, 960], '7B.webp': [720, 960], '8.webp': [720, 960],
  '9A.webp': [540, 960], '9B.webp': [540, 960],
  '10A.webp': [720, 960], '10B.webp': [720, 960]
};

function imagenHTML(nombre, alt, clase = 'opcion-img') {
  if (!nombre) return '';
  const [ancho, alto] = dimensionesImagenes[nombre] || [720, 960];
  return `<div class="${clase}"><img src="./imagenes/${nombre}" alt="${alt}" width="${ancho}" height="${alto}" decoding="async"><span hidden>No se pudo cargar la foto</span></div>`;
}

function opcionHTML(opcion) {
  const contenido = `<span class="opcion-letra">${opcion.letra}</span><span class="opcion-contenido">${opcion.texto}</span>`;
  return `<label class="opcion" data-letra="${opcion.letra}"><input class="check-opcion" type="checkbox" value="${opcion.letra}" aria-label="${opcion.texto}">${contenido}${imagenHTML(opcion.imagen, opcion.texto)}</label>`;
}

function renderizarPregunta() {
  respondida = false;
  window.scrollTo(0, 0);
  const pregunta = preguntas[indiceActual];
  $('#texto-progreso').textContent = `${indiceActual + 1} de ${preguntas.length}`;
  $('#texto-puntaje').textContent = `${puntajeTotal} pts`;
  $('#barra-relleno').style.width = `${((indiceActual + 1) / preguntas.length) * 100}%`;
  const texto = pregunta.texto.replace(/^\d+\.\s*/, '');
  const tieneImagenes = pregunta.opciones.some(opcion => opcion.imagen);
  $('#contenedor-pregunta').innerHTML = `
    <p class="pregunta-numero">PREGUNTA ${indiceActual + 1}</p>
    <h2 class="pregunta-texto">${texto}</h2>
    ${imagenHTML(pregunta.imagenPregunta, 'Imagen de la pregunta', 'img-placeholder')}
    <p class="ayuda-seleccion">Puedes marcar una o más opciones.</p>
    <div class="opciones ${tieneImagenes ? 'con-imagenes' : ''}">${pregunta.opciones.map(opcion => opcionHTML(opcion)).join('')}</div>
    <button class="btn-principal" id="btn-confirmar-seleccion" type="button" disabled>Responder <span>→</span></button>
    <div class="recompensa-puntos" id="feedback" role="status" hidden></div>`;
  const contenedorPregunta = $('#contenedor-pregunta');
  contenedorPregunta.classList.remove('pregunta-entrando', 'pregunta-saliendo');
  if (!prefiereMenosMovimiento()) {
    requestAnimationFrame(() => contenedorPregunta.classList.add('pregunta-entrando'));
  }

  $$('#contenedor-pregunta img').forEach(imagen => {
    imagen.addEventListener('load', () => { imagen.style.display = 'block'; imagen.nextElementSibling.hidden = true; });
    imagen.addEventListener('error', () => { imagen.style.display = 'none'; imagen.nextElementSibling.hidden = false; });
  });
  const confirmar = $('#btn-confirmar-seleccion');
  $$('.opcion').forEach(opcion => opcion.addEventListener('change', () => {
    opcion.classList.toggle('seleccionada', opcion.querySelector('input').checked);
    const cantidad = $$('.check-opcion:checked').length;
    confirmar.disabled = cantidad === 0;
    confirmar.innerHTML = 'Responder <span>→</span>';
  }));
  confirmar.addEventListener('click', () => {
    const marcadas = $$('.check-opcion:checked').map(check => check.value);
    if (marcadas.length) responder(marcadas);
  });
}

async function responder(marcadas) {
  if (respondida) return;
  respondida = true;
  const controles = $$('.opcion').map(opcion => opcion.querySelector('input'));
  controles.forEach(control => { control.disabled = true; control.closest('.opcion').classList.add('deshabilitada'); });
  const botonConfirmar = $('#btn-confirmar-seleccion');
  if (botonConfirmar) botonConfirmar.disabled = true;

  let resultado;
  try {
    resultado = await api('responder', {
      id: sesion,
      token: tokenSesion,
      pregunta: indiceActual + 1,
      respuestas: marcadas
    });
  } catch (error) {
    respondida = false;
    controles.forEach(control => { control.disabled = false; control.closest('.opcion').classList.remove('deshabilitada'); });
    if (botonConfirmar) botonConfirmar.disabled = false;
    const feedback = $('#feedback');
    feedback.hidden = false;
    feedback.classList.add('error');
    feedback.textContent = 'No pudimos comprobar tu respuesta. Inténtalo otra vez.';
    return;
  }

  const correctas = resultado.correctas;
  const puntos = resultado.puntos;
  const pregunta = preguntas[indiceActual];
  const opcionesCorrectas = correctas
    .map(letra => pregunta.opciones.find(opcion => opcion.letra === letra))
    .filter(Boolean);
  const claveCorrecta = correctas.length === 1
    ? `Era la ${correctas[0]}`
    : `Eran ${correctas.map(letra => `la ${letra}`).join(' y ')}`;
  const respuestaCorrecta = opcionesCorrectas.map(opcion => opcion.texto).join(' · ');
  puntajeTotal = resultado.puntaje_total;
  if (resultado.finalizado && Number.isInteger(resultado.tiempo)) tiempoFinal = resultado.tiempo;
  $$('.opcion').forEach(opcion => {
    const letra = opcion.dataset.letra;
    if (correctas.includes(letra)) opcion.classList.add('correcta');
    else if (marcadas.includes(letra)) opcion.classList.add('incorrecta');
  });
  if (botonConfirmar) botonConfirmar.style.display = 'none';
  const feedback = $('#feedback');
  feedback.classList.remove('error');
  feedback.hidden = false;
  feedback.classList.toggle('sin-puntos', puntos === 0);
  feedback.innerHTML = `
    <div class="feedback-puntaje"><strong>${puntos > 0 ? '+' : ''}${puntos}</strong><span>${puntos === 1 ? 'punto' : 'puntos'}</span></div>
    <p class="feedback-clave">${claveCorrecta}</p>
    <p class="feedback-explicacion">${respuestaCorrecta}</p>`;
  $('#texto-puntaje').textContent = `${puntajeTotal} pts`;
  await new Promise(resolve => setTimeout(resolve, 1500));
  await siguientePregunta();
}

async function siguientePregunta() {
  if (!respondida || avanzandoPregunta) return;
  avanzandoPregunta = true;
  const contenedorPregunta = $('#contenedor-pregunta');
  if (!prefiereMenosMovimiento()) {
    contenedorPregunta.classList.remove('pregunta-entrando');
    contenedorPregunta.classList.add('pregunta-saliendo');
    await new Promise(resolve => setTimeout(resolve, 280));
  }
  if (indiceActual === preguntas.length - 1) {
    clearInterval(reloj);
    guardado = Promise.resolve();
    mostrarResultadoFinal();
    avanzandoPregunta = false;
    return;
  }
  indiceActual += 1;
  renderizarPregunta();
  avanzandoPregunta = false;
}

function mostrarResultadoFinal({restaurada = false, asistencia = null} = {}) {
  $('#puntaje-final').textContent = `${puntajeTotal}/100`;
  $('#puntaje-ticket').textContent = `${puntajeTotal}/100`;
  $('#tiempo-final').textContent = formatoTiempo(tiempoFinal);
  const final = $('#pantalla-final');
  temporizadoresFinales.forEach(clearTimeout);
  temporizadoresFinales = [];
  final.classList.remove('final-secuencia', 'final-puntaje-compacto', 'final-asistencia-lista', 'final-invitacion-protagonista');
  mostrarPantalla('#pantalla-final');
  if (restaurada || prefiereMenosMovimiento()) {
    final.classList.add('final-secuencia', 'final-puntaje-compacto', 'final-asistencia-lista');
    if (restaurada) mostrarAsistenciaRestaurada(asistencia);
    return;
  }
  requestAnimationFrame(() => final.classList.add('final-secuencia'));
  temporizadoresFinales.push(setTimeout(() => final.classList.add('final-puntaje-compacto'), 1250));
  temporizadoresFinales.push(setTimeout(() => final.classList.add('final-asistencia-lista'), 2180));
}

function mostrarAsistenciaRestaurada(asistencia) {
  if (!asistencia) return;
  $('#bloque-asistencia').style.display = 'none';
  const confirmacion = $('#confirmacion-final');
  confirmacion.style.display = 'block';
  if (asistencia === 'yes') {
    confirmacion.textContent = `Asistencia confirmada, ${nombreJugador}.`;
    $('#pantalla-final').classList.add('final-invitacion-protagonista');
    $('#detalles-evento').classList.add('visible');
    cargarRankingPrevio();
    return;
  }
  confirmacion.textContent = `Gracias por avisar, ${nombreJugador}. Te vamos a extrañar.`;
}

async function restaurarSesionGuardada() {
  const saved = leerSesionLocal();
  if (!saved) return;

  $('#input-nombre').value = saved.nombre;
  $('#input-nombre').disabled = true;
  $('#btn-comenzar').disabled = true;
  try {
    const progreso = await api('progreso', {id: saved.id, token: saved.token});
    sesion = saved.id;
    tokenSesion = saved.token;
    nombreJugador = progreso.nombre;
    puntajeTotal = Number(progreso.puntaje) || 0;
    $('#input-nombre').value = nombreJugador;

    if (progreso.estado === 'completed') {
      tiempoFinal = Number(progreso.tiempo) || 0;
      mostrarResultadoFinal({restaurada: true, asistencia: progreso.asistencia});
      return;
    }

    indiceActual = Math.max(0, Math.min(Number(progreso.respuestas) || 0, preguntas.length - 1));
    iniciarReloj(Number(progreso.transcurrido) || 0);
    mostrarPantalla('#pantalla-preguntas');
    renderizarPregunta();
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      borrarSesionLocal();
      $('#input-nombre').value = '';
      $('#error-nombre').textContent = '';
    } else {
      $('#error-nombre').textContent = 'Ya habías iniciado. No pudimos recuperar tu avance; recarga para intentarlo otra vez.';
    }
    $('#input-nombre').disabled = false;
    $('#btn-comenzar').disabled = false;
  }
}

function seleccionarAsistencia(boton) {
  const respuesta = boton.dataset.asistencia;
  const confirmacion = $('#confirmacion-final');
  confirmacion.style.display = 'none';
  confirmacion.classList.remove('error');
  confirmacion.textContent = '';
  $$('.btn-asistencia').forEach(elemento => elemento.classList.toggle('activo', elemento === boton));
  if (respuesta === 'Sí') {
    const formulario = $('#form-identidad');
    formulario.hidden = false;
    $('#input-nombre-completo').value = nombreJugador;
    $('#error-identidad').textContent = '';
    requestAnimationFrame(() => formulario.classList.add('visible'));
    const nombreCompleto = nombreJugador.trim().split(/\s+/).length >= 2;
    (nombreCompleto ? $('#input-dni') : $('#input-nombre-completo')).focus();
    return;
  }
  $('#form-identidad').hidden = true;
  $('#form-identidad').classList.remove('visible');
  confirmarAsistencia('No', boton);
}

async function confirmarAsistencia(respuesta, boton, identidad = {}) {
  $$('.btn-asistencia').forEach(elemento => { elemento.classList.remove('activo'); elemento.disabled = true; });
  boton.classList.add('activo');
  $('#btn-confirmar-asistencia').disabled = true;
  const confirmacion = $('#confirmacion-final');
  confirmacion.classList.remove('error');
  confirmacion.style.display = 'block';
  confirmacion.textContent = 'Guardando tu respuesta…';
  try {
    await guardado;
    await api('asistencia', {id: sesion, token: tokenSesion, asistencia: respuesta, ...identidad});
  } catch (error) {
    if (respuesta === 'Sí') {
      confirmacion.style.display = 'none';
      $('#error-identidad').textContent = 'No pudimos guardar tus datos. Revisa la información e inténtalo otra vez.';
    } else {
      confirmacion.classList.add('error');
      confirmacion.textContent = 'No pudimos guardar tu respuesta. Revisa la conexión e inténtalo otra vez.';
    }
    $$('.btn-asistencia').forEach(elemento => elemento.disabled = false);
    $('#btn-confirmar-asistencia').disabled = false;
    return;
  }
  confirmacion.classList.remove('error');
  $('#bloque-asistencia').style.display = 'none';
  if (respuesta === 'Sí') {
    $('#input-nombre-completo').value = '';
    $('#input-dni').value = '';
    confirmacion.textContent = `Asistencia confirmada, ${nombreJugador}.`;
    const final = $('#pantalla-final');
    const invitacion = $('#detalles-evento');
    final.classList.add('final-invitacion-protagonista');
    invitacion.classList.add('visible');
    cargarRankingPrevio();
    if (!prefiereMenosMovimiento()) {
      temporizadoresFinales.push(setTimeout(() => invitacion.scrollIntoView({behavior: 'smooth', block: 'center'}), 280));
    }
    $('#btn-rehacer-solo').classList.remove('visible');
  } else {
    confirmacion.textContent = `Gracias por avisar, ${nombreJugador}. Te vamos a extrañar.`;
    $('#detalles-evento').classList.remove('visible');
    $('#btn-rehacer-solo').classList.add('visible');
  }
}

async function cargarRankingPrevio() {
  const lista = $('#ranking-previo-lista');
  lista.innerHTML = '<li class="ranking-cargando">Actualizando posiciones…</li>';
  try {
    await guardado.catch(() => {});
    const filas = await api('ranking');
    const podio = filas.slice(0, 3);
    if (!podio.length) {
      lista.innerHTML = '<li class="ranking-cargando">Todavía no hay posiciones.</li>';
      return;
    }
    const fragmento = document.createDocumentFragment();
    podio.forEach((fila, indice) => {
      const item = document.createElement('li');
      if (fila.id === sesion) item.classList.add('yo');
      const posicion = document.createElement('span');
      const premios = ['🏆', '🥈', '🥉'];
      const etiquetas = ['Primer puesto', 'Segundo puesto', 'Tercer puesto'];
      posicion.className = `ranking-premio ranking-premio-${indice + 1}`;
      posicion.textContent = premios[indice];
      posicion.setAttribute('role', 'img');
      posicion.setAttribute('aria-label', etiquetas[indice]);
      const nombre = document.createElement('span');
      nombre.className = 'ranking-nombre';
      nombre.textContent = fila.nombre;
      const puntos = document.createElement('strong');
      puntos.textContent = `${fila.puntaje} pts`;
      item.append(posicion, nombre, puntos);
      fragmento.append(item);
    });
    lista.replaceChildren(fragmento);
  } catch (error) {
    lista.innerHTML = '<li class="ranking-cargando">No pudimos actualizar el podio.</li>';
  }
}

$('#form-identidad').addEventListener('submit', evento => {
  evento.preventDefault();
  const nombreCompleto = $('#input-nombre-completo').value.trim().replace(/\s+/g, ' ');
  const dni = $('#input-dni').value.trim();
  if (nombreCompleto.split(' ').length < 2) {
    $('#error-identidad').textContent = 'Escribe tu nombre completo.';
    $('#input-nombre-completo').focus();
    return;
  }
  if (!/^\d{8}$/.test(dni)) {
    $('#error-identidad').textContent = 'El DNI debe tener 8 dígitos.';
    $('#input-dni').focus();
    return;
  }
  $('#error-identidad').textContent = '';
  confirmarAsistencia('Sí', $('[data-asistencia="Sí"]'), {nombreCompleto, dni});
});

$('#input-dni').addEventListener('input', evento => {
  evento.target.value = evento.target.value.replace(/\D/g, '').slice(0, 8);
  $('#error-identidad').textContent = '';
});
$('#input-nombre-completo').addEventListener('input', () => { $('#error-identidad').textContent = ''; });

async function abrirRanking() {
  const dialogo = $('#ranking');
  if (!dialogo.open) {
    dialogo.classList.remove('cerrando');
    dialogo.showModal();
  }
  const contenido = $('#ranking-contenido');
  contenido.textContent = 'Cargando ranking…';
  try {
    await guardado.catch(() => {});
    const filas = await api('ranking');
    if (!filas.length) { contenido.textContent = 'Todavía no hay resultados.'; return; }
    const tabla = document.createElement('table');
    tabla.innerHTML = '<thead><tr><th>#</th><th>INVITADO</th><th>PUNTOS</th><th>TIEMPO</th></tr></thead>';
    const cuerpo = document.createElement('tbody');
    filas.forEach((fila, indice) => {
      const tr = document.createElement('tr');
      if (fila.id === sesion) tr.className = 'yo';
      [indice + 1, fila.nombre, fila.puntaje, formatoTiempo(fila.tiempo)].forEach(valor => { const td = document.createElement('td'); td.textContent = valor; tr.append(td); });
      cuerpo.append(tr);
    });
    tabla.append(cuerpo);
    const envoltura = document.createElement('div');
    envoltura.className = 'tabla-wrap';
    envoltura.append(tabla);
    contenido.replaceChildren(envoltura);
  } catch (error) {
    contenido.textContent = 'No pudimos cargar el ranking. Inténtalo otra vez.';
  }
}

function cerrarRanking() {
  const dialogo = $('#ranking');
  if (!dialogo.open || dialogo.classList.contains('cerrando')) return;
  if (prefiereMenosMovimiento()) {
    dialogo.close();
    return;
  }
  dialogo.classList.add('cerrando');
  window.setTimeout(() => {
    if (dialogo.open) dialogo.close();
    dialogo.classList.remove('cerrando');
  }, 280);
}

$('.marca').addEventListener('click', evento => { evento.preventDefault(); resetear(); });
$$('[data-rehacer]').forEach(boton => boton.addEventListener('click', resetear));
$$('.btn-asistencia').forEach(boton => boton.addEventListener('click', () => seleccionarAsistencia(boton)));
$('#btn-ver-ranking').addEventListener('click', abrirRanking);
$('#btn-actualizar-ranking').addEventListener('click', abrirRanking);
$('#cerrar-ranking').addEventListener('click', cerrarRanking);
$('#ranking').addEventListener('cancel', evento => {
  evento.preventDefault();
  cerrarRanking();
});

restaurarSesionGuardada();
