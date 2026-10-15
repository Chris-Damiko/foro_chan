// Pinta un post (OP o respuesta) como <article class="post">.
// Lo usan la vista de hilo (F3) y, más adelante, el panel admin (F6).
import { cuerpoANodos, desescapar, fechaCorta, tamano } from './texto.js';
import { avatarDeTripcode } from './avatar.js';
import { el, NOMBRE_SITIO, urlYoutubeSegura } from './ui.js';

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

/**
 * @param {object} post Post o Thread de la API
 * @param {{ esOp?: boolean, reportable?: boolean, enlaceCita?: (id: number) => string | null }} [opciones]
 */
export function pintarPost(post, { esOp = false, reportable = true, enlaceCita } = {}) {
  const clases = ['post'];
  if (esOp) clases.push('post--op');
  if (post.deleted) clases.push('post--borrado');

  const article = el('article', { class: clases.join(' '), id: `p${post.id}`, 'data-id': String(post.id) });

  if (post.video && !post.deleted) article.append(tarjetaVideo(post.video));
  else if (post.image && !post.deleted) article.append(imagen(post.image));

  article.append(
    el('header', { class: 'post__cabecera' },
      esOp && post.title ? el('h1', { class: 'titulo-hilo glitch' }, desescapar(post.title)) : null,
      post.tripcode ? avatarDeTripcode(post.tripcode, 28) : null,
      el('span', { class: post.system ? 'post__anon post__anon--sistema' : 'post__anon' },
        post.system ? NOMBRE_SITIO : post.name ? desescapar(post.name) : 'Anónimo'),
      post.tripcode ? el('span', { class: 'post__trip', title: 'Firma (tripcode)' }, post.tripcode) : null,
      post.system ? null : el('span', {}, `ID:${post.anonId}`),
      el('time', { datetime: post.createdAt }, fechaCorta(post.createdAt)),
      el('a', { class: 'post__num', href: `#p${post.id}`, 'data-citar': String(post.id), title: 'Citar este post' }, `No.${post.id}`),
      reportable && !post.deleted && !post.system
        ? el('button', { class: 'post__reportar', type: 'button', 'data-reportar': String(post.id) }, 'reportar')
        : null,
    ),
    el('div', { class: 'post__cuerpo' },
      post.deleted ? '[borrado]' : cuerpoANodos(post.body, { enlaceCita })),
    el('p', { class: 'post__respuestas meta', hidden: true }),
  );
  if (post.video && !post.deleted) article.append(corazones(post.video));

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

/**
 * Video de "Querido Dross": miniatura local y enlace a YouTube, sin reproductor incrustado
 * (un iframe le pasaría a Google la IP de cada visitante). thumbUrl y publishedAt son opcionales.
 */
function tarjetaVideo(video) {
  const url = urlYoutubeSegura(video.url);
  const enlace = (hijo, attrs = {}) => (url
    ? el('a', { ...attrs, href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }, hijo)
    : hijo);
  const miniatura = el('img', {
    src: video.thumbUrl || '/img/estatica.svg',
    alt: 'Miniatura del video',
    loading: 'lazy',
    width: '480',
    height: '270',
  });
  return el('figure', { class: 'video' },
    enlace(miniatura, { class: 'video__miniatura' }),
    el('figcaption', { class: 'video__pie' },
      video.publishedAt ? el('span', { class: 'meta' }, `Publicado el ${fechaCorta(video.publishedAt).split(' ')[0]}`) : null,
      url ? enlace('Ver en YouTube', { class: 'btn btn--primario' }) : null,
    ),
  );
}

const formatoMes = new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' });

/** La fecha de un comentario es aproximada (YouTube da "hace 1 mes"): solo mes y año. */
function mesAnio(iso) {
  return formatoMes.format(new Date(iso));
}

/**
 * Comentarios de YouTube a los que Dross dio corazón (F12). Sin nombre ni foto de quien
 * comentó (lo decide el backend); el texto llega escapado y se pinta como texto.
 *   hearted ausente → todavía no se revisó; [] → revisado, sin corazones.
 */
function corazones(video) {
  const lista = video.hearted;
  const seccion = el('section', { class: 'corazones', 'aria-label': 'Comentarios con corazón de Dross' },
    el('h2', { class: 'corazones__titulo' }, el('span', { class: 'corazones__icono', 'aria-hidden': 'true' }, '\u2764'), ' Comentarios con corazón de Dross'),
  );
  if (!Array.isArray(lista)) {
    seccion.append(el('p', { class: 'meta' }, 'Revisando comentarios…'));
    return seccion;
  }
  if (!lista.length) {
    seccion.append(el('p', { class: 'meta' }, 'Dross todavía no marcó comentarios.'));
    return seccion;
  }
  seccion.append(el('ol', { class: 'corazones__lista' }, ...lista.map((c) =>
    el('li', { class: 'corazon' },
      el('p', { class: 'corazon__texto' }, desescapar(c.text)),
      el('p', { class: 'meta' },
        `${c.likes.toLocaleString('es')} ${c.likes === 1 ? 'like' : 'likes'}`,
        c.at ? ` · ${mesAnio(c.at)}` : ''),
    ))));
  if (video.heartedAt) seccion.append(el('p', { class: 'meta corazones__revisado' }, `Revisado el ${fechaCorta(video.heartedAt)}`));
  return seccion;
}

/** Ids citados (>>123) en un body escapado. */
export function citasDe(bodyEscapado) {
  return [...desescapar(bodyEscapado).matchAll(/>>(\d+)/g)].map((m) => Number(m[1]));
}
