// Página de tablero: catálogo de hilos, paginación y formulario de nuevo hilo.
import { crearHilo, obtenerHilos, obtenerTableros } from './api.js';
import { desescapar } from './texto.js';
import {
  conectarContador, el, errorDeCampo, insigniaEstado, NOMBRE_SITIO,
  pintarBarra, sinSenal, urlHilo, urlTablero,
} from './ui.js';

const MAX_IMAGEN = 4 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FUENTES = 10;

const params = new URLSearchParams(location.search);
const tableroId = params.get('b');
const pagina = Math.max(1, Number.parseInt(params.get('p'), 10) || 1);

const catalogo = document.getElementById('catalogo');
const paginacion = document.getElementById('paginacion');

if (tableroId) iniciar();
else location.replace('/');

async function iniciar() {
  pintarEsqueletos();

  const [resTableros, resHilos] = await Promise.all([obtenerTableros(), obtenerHilos(tableroId, pagina)]);

  const tableros = resTableros.ok ? resTableros.data : [];
  const tablero = tableros.find((t) => t.id === tableroId);
  pintarBarra(tableros, tableroId);

  if (resTableros.ok && !tablero) {
    pintarCabecera(`/${tableroId}/`, '');
    document.getElementById('nuevo-hilo').hidden = true;
    catalogo.replaceChildren(sinSenal('Este tablero no existe.'));
    return;
  }

  pintarCabecera(tablero ? `/${tablero.id}/ · ${tablero.name}` : `/${tableroId}/`, tablero?.description ?? '');
  prepararFormulario();
  if (resHilos.ok) {
    pintarCatalogo(resHilos.data.threads);
    pintarPaginacion(resHilos.data.page, resHilos.data.totalPages);
  } else {
    catalogo.replaceChildren(sinSenal(resHilos.error));
  }
}

function pintarCabecera(titulo, descripcion) {
  document.getElementById('titulo').textContent = titulo;
  document.getElementById('descripcion').textContent = descripcion;
  document.title = `${titulo} · ${NOMBRE_SITIO}`;
}

function pintarEsqueletos() {
  catalogo.replaceChildren(...Array.from({ length: 6 }, () =>
    el('div', { class: 'tarjeta', 'aria-hidden': 'true' },
      el('div', { class: 'tarjeta__miniatura esqueleto' }),
      el('span', { class: 'esqueleto', style: 'height: 1.2em' }),
      el('span', { class: 'esqueleto', style: 'height: 0.8em; width: 50%' }),
    ),
  ));
}

function pintarCatalogo(hilos) {
  if (!hilos.length) {
    catalogo.replaceChildren(sinSenal('Sé el primero en abrir un hilo.'));
    return;
  }
  catalogo.replaceChildren(...hilos.map(tarjeta));
}

function tarjeta(hilo) {
  const miniatura = el('img', {
    class: 'tarjeta__miniatura',
    src: hilo.image?.thumbUrl ?? '/img/estatica.svg',
    alt: '',
    loading: 'lazy',
  });
  const respuestas = `R: ${hilo.replyCount}`;
  return el('a', { class: 'tarjeta', href: urlHilo(hilo.id) },
    miniatura,
    hilo.status ? insigniaEstado(hilo.status) : null,
    el('span', { class: 'tarjeta__titulo' }, desescapar(hilo.title)),
    el('span', { class: 'meta' }, `${respuestas} · No.${hilo.id}`),
    el('span', { class: 'tarjeta__extracto' }, desescapar(hilo.body)),
  );
}

function pintarPaginacion(actual, total) {
  if (total <= 1) {
    paginacion.replaceChildren();
    return;
  }
  const enlaces = [];
  for (let n = 1; n <= total; n++) {
    enlaces.push(n === actual
      ? el('span', { 'aria-current': 'page' }, String(n))
      : el('a', { href: urlTablero(tableroId, n) }, String(n)));
  }
  paginacion.replaceChildren(...enlaces);
}

function prepararFormulario() {
  const form = document.getElementById('form-hilo');
  const esCasos = tableroId === 'casos';
  const campoFuentes = document.getElementById('campo-fuentes');
  campoFuentes.hidden = !esCasos;
  document.getElementById('f-fuentes').required = esCasos;

  form.querySelectorAll('[maxlength]').forEach(conectarContador);

  const inputImagen = document.getElementById('f-imagen');
  const vistaPrevia = document.getElementById('vista-previa');
  inputImagen.addEventListener('change', () => {
    const archivo = inputImagen.files[0];
    if (vistaPrevia.src) URL.revokeObjectURL(vistaPrevia.src);
    const error = archivo ? validarImagen(archivo) : null;
    errorDeCampo(inputImagen.closest('.campo'), error);
    vistaPrevia.hidden = !archivo || Boolean(error);
    if (archivo && !error) vistaPrevia.src = URL.createObjectURL(archivo);
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = leerFormulario(form, esCasos);
    if (!datos) return;

    const boton = form.querySelector('button[type="submit"]');
    const errorGeneral = document.getElementById('error-general');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    errorGeneral.hidden = true;

    const res = await crearHilo(tableroId, datos);
    if (res.ok) {
      location.assign(urlHilo(res.data.id));
      return;
    }
    boton.disabled = false;
    boton.textContent = 'Publicar';
    errorGeneral.textContent = res.error;
    errorGeneral.hidden = false;
  });
}

/** Valida en el navegador. Devuelve los datos o null si hay errores (ya pintados). */
function leerFormulario(form, esCasos) {
  // Por id y no con form.title/form.name: chocan con propiedades del <form>.
  const $ = (id) => document.getElementById(id);
  const campo = (id) => $(id).closest('.campo');
  const title = $('f-titulo').value.trim();
  const body = $('f-cuerpo').value.trim();
  const name = $('f-nombre').value.trim();
  const image = $('f-imagen').files[0];
  const sources = esCasos
    ? $('f-fuentes').value.split('\n').map((s) => s.trim()).filter(Boolean)
    : [];

  const errores = {
    'f-titulo': title ? null : 'Escribe un título.',
    'f-cuerpo': body ? null : 'Escribe un mensaje.',
    'f-fuentes': esCasos ? validarFuentes(sources) : null,
    'f-imagen': image ? validarImagen(image) : null,
  };
  for (const [id, error] of Object.entries(errores)) errorDeCampo(campo(id), error);

  const primero = Object.keys(errores).find((id) => errores[id]);
  if (primero) {
    document.getElementById(primero).focus();
    return null;
  }
  return { title, body, name, sources, image };
}

function validarFuentes(fuentes) {
  if (!fuentes.length) return 'Los hilos de Casos necesitan al menos una fuente.';
  if (fuentes.length > MAX_FUENTES) return `Máximo ${MAX_FUENTES} fuentes.`;
  const mala = fuentes.find((f) => {
    try {
      return !['http:', 'https:'].includes(new URL(f).protocol);
    } catch {
      return true;
    }
  });
  return mala ? `No es una URL válida: ${mala}` : null;
}

function validarImagen(archivo) {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'Solo JPG, PNG, GIF o WEBP.';
  if (archivo.size > MAX_IMAGEN) return 'La imagen pesa más de 4 MB.';
  return null;
}
