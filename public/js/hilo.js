// Vista de hilo (F3) con panel de caso (F4): posts, citas, respuestas y fuentes.
import { obtenerHilo, obtenerTableros, responder } from './api.js';
import { conectarVistaPrevia, enviando } from './formulario.js';
import { citasDe, pintarPost } from './post.js';
import { desescapar, fechaCorta } from './texto.js';
import {
  conectarContador, el, errorDeCampo, insigniaEstado, NOMBRE_SITIO,
  pintarBarra, sinSenal, urlTablero,
} from './ui.js';

const hiloId = Number.parseInt(new URLSearchParams(location.search).get('id'), 10);
const contenedorPosts = document.getElementById('posts');
const form = document.getElementById('form-respuesta');
const textarea = document.getElementById('r-cuerpo');

/** id → post de este hilo (OP incluido). */
let indice = new Map();

if (Number.isInteger(hiloId) && hiloId > 0) {
  prepararFormulario();
  conectarCitas();
  obtenerTableros().then((res) => res.ok && pintarBarra(res.data, null));
  cargar();
} else {
  contenedorPosts.replaceChildren(sinSenal('Este hilo no existe.'));
}

async function cargar(enfocar = location.hash) {
  const res = await obtenerHilo(hiloId);
  if (!res.ok) {
    const mensaje = res.status === 404 ? 'Este hilo no existe o fue borrado.' : res.error;
    contenedorPosts.replaceChildren(sinSenal(mensaje));
    form.hidden = true;
    return;
  }

  const { thread, replies } = res.data;
  indice = new Map([thread, ...replies].map((p) => [p.id, p]));

  document.title = `${desescapar(thread.title)} · ${NOMBRE_SITIO}`;
  const volver = document.getElementById('volver');
  volver.href = urlTablero(thread.board);
  volver.textContent = `[volver a /${thread.board}/]`;

  const enlaceCita = (id) => {
    const citado = indice.get(id);
    return citado && !citado.deleted ? `#p${id}` : null;
  };
  contenedorPosts.replaceChildren(
    pintarPost(thread, { esOp: true, enlaceCita }),
    ...replies.map((r) => pintarPost(r, { enlaceCita })),
  );
  pintarRespuestasA();
  pintarCaso(thread);
  form.hidden = false;

  if (enfocar) resaltar(enfocar.slice(1));
}

/** Debajo de cada post: "Respuestas: >>12 >>15" (quién lo citó). */
function pintarRespuestasA() {
  const citadoPor = new Map();
  for (const post of indice.values()) {
    if (post.deleted) continue;
    for (const id of new Set(citasDe(post.body))) {
      if (!indice.has(id)) continue;
      if (!citadoPor.has(id)) citadoPor.set(id, []);
      citadoPor.get(id).push(post.id);
    }
  }
  for (const [id, quienes] of citadoPor) {
    const nodo = document.querySelector(`#p${id} > .post__respuestas`);
    if (!nodo) continue;
    nodo.replaceChildren('Respuestas: ', ...quienes.flatMap((q) => [
      el('a', { class: 'cita', href: `#p${q}`, 'data-cita': String(q) }, `>>${q}`), ' ',
    ]));
    nodo.hidden = false;
  }
}

function pintarCaso(thread) {
  const panel = document.getElementById('panel-caso');
  const esCaso = Boolean(thread.status);
  panel.hidden = !esCaso;
  document.getElementById('disposicion').className = esCaso ? 'con-lateral' : '';
  if (!esCaso) return;

  const historial = thread.statusHistory?.length
    ? thread.statusHistory
    : [{ status: thread.status, at: thread.createdAt }];
  document.getElementById('linea-tiempo').replaceChildren(...historial.map((h) =>
    el('li', {}, insigniaEstado(h.status), el('br'), el('span', { class: 'meta' }, fechaCorta(h.at))),
  ));

  // sources NO viene escapado: solo como atributo href y como texto, nunca como HTML.
  const fuentes = (thread.sources ?? []).filter(esHttp);
  document.getElementById('fuentes').replaceChildren(...fuentes.map((url) =>
    el('li', {}, el('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }, textoDeUrl(url))),
  ));
}

function esHttp(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function textoDeUrl(url) {
  const u = new URL(url);
  return (u.host + u.pathname + u.search).replace(/\/$/, '');
}

function resaltar(idAncla) {
  document.querySelectorAll('.post--resaltado').forEach((p) => p.classList.remove('post--resaltado'));
  const objetivo = document.getElementById(idAncla);
  if (!objetivo?.classList.contains('post')) return;
  objetivo.classList.add('post--resaltado');
  objetivo.scrollIntoView({ block: 'center' });
}

/** Clic en No.123 cita el post; hover en >>123 muestra una vista previa. */
function conectarCitas() {
  contenedorPosts.addEventListener('click', (evento) => {
    const citar = evento.target.closest('[data-citar]');
    if (citar) {
      evento.preventDefault();
      citarEnRespuesta(citar.dataset.citar);
      return;
    }
    const cita = evento.target.closest('a.cita[href^="#p"]');
    if (cita) {
      evento.preventDefault();
      history.replaceState(null, '', cita.getAttribute('href'));
      resaltar(cita.getAttribute('href').slice(1));
    }
  });

  let vista = null;
  const quitarVista = () => { vista?.remove(); vista = null; };
  contenedorPosts.addEventListener('mouseover', (evento) => {
    const cita = evento.target.closest('a.cita[data-cita]');
    if (!cita || !matchMedia('(hover: hover)').matches) return;
    const original = document.getElementById(`p${cita.dataset.cita}`);
    if (!original) return;
    quitarVista();
    vista = original.cloneNode(true);
    vista.removeAttribute('id');
    vista.classList.remove('post--op', 'post--resaltado');
    vista.classList.add('vista-cita');
    const caja = cita.getBoundingClientRect();
    vista.style.left = `${Math.min(caja.left, innerWidth - 420)}px`;
    vista.style.top = `${caja.bottom + 6}px`;
    document.body.append(vista);
    const alto = vista.getBoundingClientRect().height;
    if (caja.bottom + 6 + alto > innerHeight) vista.style.top = `${Math.max(6, caja.top - alto - 6)}px`;
  });
  contenedorPosts.addEventListener('mouseout', (evento) => {
    if (evento.target.closest('a.cita[data-cita]')) quitarVista();
  });
}

function citarEnRespuesta(id) {
  const prefijo = textarea.value && !textarea.value.endsWith('\n') ? '\n' : '';
  textarea.value += `${prefijo}>>${id}\n`;
  textarea.dispatchEvent(new Event('input'));
  textarea.focus();
  form.scrollIntoView({ block: 'nearest' });
}

function prepararFormulario() {
  form.querySelectorAll('[maxlength]').forEach(conectarContador);
  const inputImagen = document.getElementById('r-imagen');
  conectarVistaPrevia(inputImagen, document.getElementById('r-vista-previa'));

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const body = textarea.value.trim();
    const image = inputImagen.files[0];
    const name = document.getElementById('r-nombre').value.trim();
    const errorGeneral = document.getElementById('r-error');

    const sinNada = !body && !image;
    errorDeCampo(textarea.closest('.campo'), sinNada ? 'Escribe un mensaje o adjunta una imagen.' : null);
    if (sinNada || inputImagen.closest('.campo').classList.contains('campo--error')) return;

    errorGeneral.hidden = true;
    const restaurar = enviando(form.querySelector('button[type="submit"]'));
    const res = await responder(hiloId, { body, name, image });
    restaurar();

    if (!res.ok) {
      errorGeneral.textContent = res.error;
      errorGeneral.hidden = false;
      return;
    }
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    inputImagen.value = '';
    inputImagen.dispatchEvent(new Event('change'));
    history.replaceState(null, '', `#p${res.data.id}`);
    await cargar(`#p${res.data.id}`);
  });
}
