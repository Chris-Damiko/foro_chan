// Piezas de interfaz compartidas por todas las páginas.
import { desescapar, NOMBRES_ESTADO } from './texto.js';

export const NOMBRE_SITIO = 'DearDross';

/**
 * Crea un elemento. Los hijos string se insertan como texto (nunca como HTML).
 * @param {string} tag
 * @param {Record<string, string | boolean | undefined>} [attrs]
 * @param {...(Node | string | null | undefined)} hijos
 */
export function el(tag, attrs = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of hijos) {
    if (hijo !== null && hijo !== undefined) nodo.append(hijo);
  }
  return nodo;
}

export function urlTablero(id, pagina = 1) {
  return pagina > 1 ? `/tablero.html?b=${encodeURIComponent(id)}&p=${pagina}` : `/tablero.html?b=${encodeURIComponent(id)}`;
}

export function urlHilo(id) {
  return `/hilo.html?id=${encodeURIComponent(id)}`;
}

/** Rellena la barra superior (<header class="barra">) con el logo y los tableros. */
export function pintarBarra(tableros, actual = null) {
  const barra = document.querySelector('.barra');
  if (!barra) return;
  const nav = el('nav', { class: 'barra__tableros', 'aria-label': 'Tableros' });
  for (const t of tableros) {
    nav.append(el('a', {
      href: urlTablero(t.id),
      title: t.name,
      'aria-current': t.id === actual ? 'page' : undefined,
    }, t.id));
  }
  barra.replaceChildren(
    el('a', { class: 'barra__logo glitch', href: '/' }, NOMBRE_SITIO),
    nav,
    el('span', { class: 'barra__extra mono' },
      el('a', { href: '/reglas.html' }, '[reglas]'), ' ',
      el('a', { href: '/entrar.html' }, '[entrar]'),
    ),
  );
}

export function insigniaEstado(status) {
  return el('span', { class: `estado estado--${status}` }, NOMBRES_ESTADO[status] ?? status);
}

export function sinSenal(mensaje) {
  return el('div', { class: 'sin-senal' },
    el('p', { class: 'sin-senal__titulo' }, 'SIN SEÑAL'),
    el('p', {}, mensaje),
  );
}

/** Pone o quita el mensaje de error de un campo (.campo). */
export function errorDeCampo(campo, mensaje) {
  campo.classList.toggle('campo--error', Boolean(mensaje));
  let nodo = campo.querySelector('.campo__error');
  if (!mensaje) {
    nodo?.remove();
    return;
  }
  if (!nodo) {
    nodo = el('span', { class: 'campo__error', role: 'alert' });
    campo.append(nodo);
  }
  nodo.textContent = mensaje;
}

/** Contador "n / max" para un input o textarea con maxlength. */
export function conectarContador(input) {
  const max = Number(input.getAttribute('maxlength'));
  const contador = input.closest('.campo')?.querySelector('.campo__contador');
  if (!max || !contador) return;
  const actualizar = () => { contador.textContent = `${input.value.length} / ${max}`; };
  input.addEventListener('input', actualizar);
  actualizar();
}

/** Solo enlaces https a YouTube (Thread.video.url no viene escapado). */
export function urlYoutubeSegura(url) {
  try {
    const u = new URL(url);
    const hosts = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'];
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

/** Tarjeta de catálogo para un hilo (tablero y portada). Los hilos de video usan su miniatura local. */
export function tarjetaHilo(hilo, { grande = false } = {}) {
  const miniatura = el('img', {
    class: 'tarjeta__miniatura',
    src: hilo.video?.thumbUrl || hilo.image?.thumbUrl || '/img/estatica.svg',
    alt: '',
    loading: 'lazy',
  });
  const clases = ['tarjeta'];
  if (hilo.video) clases.push('tarjeta--video');
  if (grande) clases.push('tarjeta--grande');
  return el('a', { class: clases.join(' '), href: urlHilo(hilo.id) },
    miniatura,
    hilo.status ? insigniaEstado(hilo.status) : null,
    el('span', { class: 'tarjeta__titulo' }, desescapar(hilo.title)),
    el('span', { class: 'meta' }, `R: ${hilo.replyCount} · No.${hilo.id}`),
    hilo.video ? null : el('span', { class: 'tarjeta__extracto' }, desescapar(hilo.body)),
  );
}
