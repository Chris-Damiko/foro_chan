// Portada: lista de tableros con su número de hilos.
import { obtenerTableros } from './api.js';
import { el, pintarBarra, sinSenal, urlTablero } from './ui.js';

const lista = document.getElementById('tableros');

const { ok, data, error } = await obtenerTableros();

if (!ok) {
  lista.replaceChildren(el('li', {}, sinSenal(error)));
} else {
  pintarBarra(data);
  lista.replaceChildren(...data.map((t) =>
    el('li', {},
      el('a', { class: 'tablero-item', href: urlTablero(t.id) },
        el('span', { class: 'tablero-item__id' }, `/${t.id}/`),
        el('span', { class: 'tablero-item__nombre' }, t.name),
        el('span', { class: 'tablero-item__desc' }, t.description),
        el('span', { class: 'tablero-item__cuenta meta' }, `${t.threadCount} ${t.threadCount === 1 ? 'hilo' : 'hilos'}`),
      ),
    ),
  ));
}
