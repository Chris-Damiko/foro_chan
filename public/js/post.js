// Pinta un post (OP o respuesta) como <article class="post">.
// Lo usan la vista de hilo (F3) y, más adelante, el panel admin (F6).
import { cuerpoANodos, desescapar, fechaCorta, tamano } from './texto.js';
import { avatarDeTripcode } from './avatar.js';
import { el } from './ui.js';

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

/**
 * @param {object} post Post o Thread de la API
 * @param {{ esOp?: boolean, enlaceCita?: (id: number) => string | null }} [opciones]
 */
export function pintarPost(post, { esOp = false, enlaceCita } = {}) {
  const clases = ['post'];
  if (esOp) clases.push('post--op');
  if (post.deleted) clases.push('post--borrado');

  const article = el('article', { class: clases.join(' '), id: `p${post.id}`, 'data-id': String(post.id) });

  if (post.image && !post.deleted) article.append(imagen(post.image));

  article.append(
    el('header', { class: 'post__cabecera' },
      esOp && post.title ? el('h1', { class: 'titulo-hilo glitch' }, desescapar(post.title)) : null,
      post.tripcode ? avatarDeTripcode(post.tripcode, 28) : null,
      el('span', { class: 'post__anon' }, post.name ? desescapar(post.name) : 'Anónimo'),
      post.tripcode ? el('span', { class: 'post__trip', title: 'Firma (tripcode)' }, post.tripcode) : null,
      el('span', {}, `ID:${post.anonId}`),
      el('time', { datetime: post.createdAt }, fechaCorta(post.createdAt)),
      el('a', { class: 'post__num', href: `#p${post.id}`, 'data-citar': String(post.id), title: 'Citar este post' }, `No.${post.id}`),
    ),
    el('div', { class: 'post__cuerpo' },
      post.deleted ? '[borrado]' : cuerpoANodos(post.body, { enlaceCita })),
    el('p', { class: 'post__respuestas meta', hidden: true }),
  );

  return article;
}

function imagen(img) {
  const ext = EXTENSIONES[img.mime] ?? '';
  const miniatura = el('img', {
    src: img.thumbUrl,
    alt: 'Imagen adjunta (clic para ampliar)',
    loading: 'lazy',
    width: String(Math.min(img.width, 250)),
    height: String(Math.round(img.height * Math.min(1, 250 / Math.max(img.width, img.height)))),
  });
  const enlace = el('a', { href: img.url, target: '_blank', rel: 'noopener' }, miniatura);
  const figura = el('figure', { class: 'post__imagen' },
    el('span', { class: 'meta' }, `${ext.toUpperCase()} · ${tamano(img.size)} · ${img.width}×${img.height}`),
    enlace,
  );

  // Clic: alterna entre miniatura e imagen completa sin salir de la página.
  enlace.addEventListener('click', (evento) => {
    if (evento.ctrlKey || evento.metaKey || evento.button !== 0) return;
    evento.preventDefault();
    const abierta = figura.classList.toggle('post__imagen--abierta');
    miniatura.src = abierta ? img.url : img.thumbUrl;
    miniatura.removeAttribute('width');
    miniatura.removeAttribute('height');
  });

  return figura;
}

/** Ids citados (>>123) en un body escapado. */
export function citasDe(bodyEscapado) {
  return [...desescapar(bodyEscapado).matchAll(/>>(\d+)/g)].map((m) => Number(m[1]));
}
