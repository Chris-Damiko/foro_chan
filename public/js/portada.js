// Portada: lista de tableros con su número de hilos.
import { obtenerHilos, obtenerTableros } from './api.js';
import { el, pintarBarra, sinSenal, tarjetaHilo, urlTablero } from './ui.js';

const TABLERO_VIDEOS = 'qd';
const VIDEOS_EN_PORTADA = 8;

const lista = document.getElementById('tableros');

const { ok, data, error } = await obtenerTableros();

if (!ok) {
  lista.replaceChildren(el('li', {}, sinSenal(error)));
} else {
  pintarBarra(data);
  lista.replaceChildren(...data.map((t) =>
    el('li', {},
      el('a', { class: t.id === TABLERO_VIDEOS ? 'tablero-item tablero-item--principal' : 'tablero-item', href: urlTablero(t.id) },
        el('span', { class: 'tablero-item__id' }, `/${t.id}/`),
        el('span', { class: 'tablero-item__nombre' }, t.name),
        el('span', { class: 'tablero-item__desc' }, t.description),
        el('span', { class: 'tablero-item__cuenta meta' }, `${t.threadCount} ${t.threadCount === 1 ? 'hilo' : 'hilos'}`),
      ),
    ),
  ));
}

// Querido Dross: grilla con los últimos videos (cada uno es un hilo).
if (ok && data.some((t) => t.id === TABLERO_VIDEOS)) {
  const seccion = document.getElementById('videos');
  const grilla = document.getElementById('grilla-videos');
  seccion.hidden = false;
  grilla.replaceChildren(...Array.from({ length: 4 }, () =>
    el('div', { class: 'tarjeta tarjeta--video', 'aria-hidden': 'true' }, el('div', { class: 'tarjeta__miniatura esqueleto' }))));
  const res = await obtenerHilos(TABLERO_VIDEOS, 1);
  if (!res.ok) grilla.replaceChildren(sinSenal(res.error));
  else if (!res.data.threads.length) grilla.replaceChildren(sinSenal('Todavía no hay videos importados.'));
  else grilla.replaceChildren(...res.data.threads.slice(0, VIDEOS_EN_PORTADA).map((h) => tarjetaHilo(h, { grande: true })));
}
