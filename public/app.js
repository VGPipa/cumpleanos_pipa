
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

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pantallas = $$('.pantalla');

// La primera carga usa el mismo estado visual que el botón Resetear.
mostrarPantalla('#pantalla-inicio');

function mostrarPantalla(selector) {
  document.body.classList.toggle('en-inicio', selector === '#pantalla-inicio');
  document.body.classList.toggle('en-preguntas', selector === '#pantalla-preguntas');
  pantallas.forEach(pantalla => pantalla.classList.remove('activa'));
  $(selector).classList.add('activa');
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function formatoTiempo(ms) {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

async function api(endpoint, body) {
  const opciones = body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {};
  const respuesta = await fetch(`./api/${endpoint}`, opciones);
  if (!respuesta.ok) throw new Error('Error de conexión');
  return respuesta.json();
}

function limpiarEstado({conservarNombre = false} = {}) {
  clearInterval(reloj);
  reloj = null;
  sesion = null;
  tokenSesion = null;
  inicio = 0;
  tiempoFinal = 0;
  respondida = false;
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
  $('#estado-guardado').textContent = '';
  $('#confirmacion-final').style.display = 'none';
  $('#confirmacion-final').textContent = '';
  $('#detalles-evento').classList.remove('visible');
  $('#btn-rehacer-solo').classList.remove('visible');
  $('#bloque-asistencia').style.display = '';
  $$('.btn-asistencia').forEach(boton => { boton.classList.remove('activo'); boton.disabled = false; });
}

function resetear() {
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
  inicio = Date.now();
  reloj = setInterval(() => $('#cronometro').textContent = formatoTiempo(Date.now() - inicio), 250);
  mostrarPantalla('#pantalla-preguntas');
  renderizarPregunta();
});

$('#input-nombre').addEventListener('input', evento => {
  evento.target.classList.remove('invalido');
  $('#error-nombre').textContent = '';
});

function imagenHTML(nombre, alt, clase = 'opcion-img') {
  if (!nombre) return '';
  return `<div class="${clase}"><img src="./imagenes/${nombre}" alt="${alt}"><span hidden>No se pudo cargar la foto</span></div>`;
}

function opcionHTML(opcion, multiple) {
  const contenido = `<span class="opcion-letra">${opcion.letra}</span><span class="opcion-contenido">${opcion.texto}</span>`;
  if (multiple) {
    return `<label class="opcion multiple" data-letra="${opcion.letra}"><input class="check-opcion" type="checkbox" value="${opcion.letra}" aria-label="${opcion.texto}">${contenido}${imagenHTML(opcion.imagen, opcion.texto)}</label>`;
  }
  return `<button class="opcion" data-letra="${opcion.letra}" type="button">${contenido}${imagenHTML(opcion.imagen, opcion.texto)}</button>`;
}

function renderizarPregunta() {
  respondida = false;
  $('#pantalla-preguntas').scrollTop = 0;
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
    <div class="opciones ${tieneImagenes ? 'con-imagenes' : ''}">${pregunta.opciones.map(opcion => opcionHTML(opcion, pregunta.tipo === 'multiple')).join('')}</div>
    ${pregunta.tipo === 'multiple' ? '<button class="btn-principal" id="btn-confirmar-multiple" type="button">Confirmar respuesta <span>→</span></button>' : ''}
    <div class="feedback-correcta" id="feedback" hidden></div>
    <button class="btn-siguiente" id="btn-siguiente" type="button">Continuar →</button>`;

  $$('#contenedor-pregunta img').forEach(imagen => {
    imagen.addEventListener('load', () => { imagen.style.display = 'block'; imagen.nextElementSibling.hidden = true; });
    imagen.addEventListener('error', () => { imagen.style.display = 'none'; imagen.nextElementSibling.hidden = false; });
  });
  if (pregunta.tipo === 'multiple') {
    $$('.opcion.multiple').forEach(opcion => opcion.addEventListener('change', () => opcion.classList.toggle('seleccionada', opcion.querySelector('input').checked)));
    $('#btn-confirmar-multiple').addEventListener('click', () => {
      const marcadas = $$('.check-opcion:checked').map(check => check.value);
      if (marcadas.length) responder(marcadas);
    });
  } else {
    $$('.opcion').forEach(opcion => opcion.addEventListener('click', () => responder([opcion.dataset.letra])));
  }
  $('#btn-siguiente').addEventListener('click', siguientePregunta);
}

async function responder(marcadas) {
  if (respondida) return;
  respondida = true;
  const pregunta = preguntas[indiceActual];
  const controles = $$('.opcion').map(opcion => opcion.matches('button') ? opcion : opcion.querySelector('input'));
  controles.forEach(control => { control.disabled = true; });
  const botonMultiple = $('#btn-confirmar-multiple');
  if (botonMultiple) botonMultiple.disabled = true;

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
    controles.forEach(control => { control.disabled = false; });
    if (botonMultiple) botonMultiple.disabled = false;
    const feedback = $('#feedback');
    feedback.hidden = false;
    feedback.classList.add('error');
    feedback.textContent = 'No pudimos comprobar tu respuesta. Inténtalo otra vez.';
    return;
  }

  const correctas = resultado.correctas;
  const puntos = resultado.puntos;
  puntajeTotal = resultado.puntaje_total;
  if (resultado.finalizado && Number.isInteger(resultado.tiempo)) tiempoFinal = resultado.tiempo;
  $$('.opcion').forEach(opcion => {
    const letra = opcion.dataset.letra;
    if (correctas.includes(letra)) opcion.classList.add('correcta');
    else if (marcadas.includes(letra)) opcion.classList.add('incorrecta');
  });
  if (botonMultiple) botonMultiple.style.display = 'none';
  const feedback = $('#feedback');
  const aciertoCompleto = resultado.acierto_completo;
  const respuestasCorrectas = correctas.map(letra => `${letra}. ${pregunta.opciones.find(opcion => opcion.letra === letra).texto}`).join(' y ');
  feedback.hidden = false;
  feedback.classList.toggle('error', !puntos);
  feedback.innerHTML = aciertoCompleto ? `<strong>¡Correcto!</strong> +${puntos} puntos` : puntos ? `<strong>¡Casi!</strong> La respuesta completa era ${respuestasCorrectas}. +${puntos} puntos` : `La respuesta correcta era <strong>${respuestasCorrectas}</strong>.`;
  $('#btn-siguiente').style.display = 'block';
  $('#texto-puntaje').textContent = `${puntajeTotal} pts`;
}

function siguientePregunta() {
  if (!respondida) return;
  if (indiceActual === preguntas.length - 1) {
    clearInterval(reloj);
    guardado = Promise.resolve();
    $('#estado-guardado').textContent = '✓ Tu resultado ya está en el ranking';
    mostrarResultadoFinal();
    return;
  }
  indiceActual += 1;
  renderizarPregunta();
}

function mostrarResultadoFinal() {
  $('#puntaje-final').textContent = `${puntajeTotal}/100`;
  $('#tiempo-final').textContent = formatoTiempo(tiempoFinal);
  const porcentaje = puntajeTotal;
  $('#puntaje-mensaje').textContent = porcentaje === 100 ? `¡${nombreJugador}, conoces a Pipa como nadie!` : porcentaje >= 70 ? `¡Muy bien, ${nombreJugador}! Conoces bastante a Pipa.` : porcentaje >= 40 ? `Buen intento, ${nombreJugador}. Aún quedan secretos por descubrir.` : `Gracias por jugar, ${nombreJugador}. ¡Toca conocer mejor a Pipa!`;
  mostrarPantalla('#pantalla-final');
}

async function confirmarAsistencia(respuesta, boton) {
  $$('.btn-asistencia').forEach(elemento => { elemento.classList.remove('activo'); elemento.disabled = true; });
  boton.classList.add('activo');
  const confirmacion = $('#confirmacion-final');
  confirmacion.style.display = 'block';
  confirmacion.textContent = 'Guardando tu respuesta…';
  try {
    await guardado;
    await api('asistencia', {id: sesion, token: tokenSesion, asistencia: respuesta});
  } catch (error) {
    confirmacion.textContent = 'No pudimos guardar tu respuesta. Inténtalo otra vez.';
    $$('.btn-asistencia').forEach(elemento => elemento.disabled = false);
    return;
  }
  $('#bloque-asistencia').style.display = 'none';
  if (respuesta === 'Sí' || respuesta === 'Tal vez') {
    confirmacion.textContent = respuesta === 'Sí' ? `¡Nos vemos en la fiesta, ${nombreJugador}! Tu asistencia quedó confirmada 🎉` : `¡Ojalá puedas venir, ${nombreJugador}! Guarda los detalles por si te animas 💜`;
    $('#detalles-evento').classList.add('visible');
    $('#btn-rehacer-solo').classList.remove('visible');
  } else {
    confirmacion.textContent = `Gracias por avisar, ${nombreJugador}. ¡Te vamos a extrañar! 💜`;
    $('#detalles-evento').classList.remove('visible');
    $('#btn-rehacer-solo').classList.add('visible');
  }
}

async function abrirRanking() {
  const dialogo = $('#ranking');
  if (!dialogo.open) dialogo.showModal();
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

$('#btn-reset').addEventListener('click', resetear);
$('.marca').addEventListener('click', evento => { evento.preventDefault(); resetear(); });
$$('[data-rehacer]').forEach(boton => boton.addEventListener('click', resetear));
$$('.btn-asistencia').forEach(boton => boton.addEventListener('click', () => confirmarAsistencia(boton.dataset.asistencia, boton)));
$('#btn-ver-ranking').addEventListener('click', abrirRanking);
$('#btn-actualizar-ranking').addEventListener('click', abrirRanking);
$('#cerrar-ranking').addEventListener('click', () => $('#ranking').close());
