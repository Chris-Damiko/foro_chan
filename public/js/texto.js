// Formato de texto de los posts.
// Regla de seguridad: nunca innerHTML con datos de la API. El backend manda
// title/body con HTML escapado; aquí se desescapa y se pinta con nodos de texto.

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** Revierte el escapeHtml del backend (src/text.js). */
export function desescapar(texto = '') {
  return texto.replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTIDADES[e]);
}

const CITA = />>(\d+)/g;

/**
 * Convierte el body de un post en nodos: greentext para líneas con ">",
 * enlaces para ">>123". `enlaceCita(id)` devuelve el href de la cita, o null
 * si el post está borrado o no existe (se pinta tachado).
 * @param {string} bodyEscapado
 * @param {{ enlaceCita?: (id: number) => string | null }} [opciones]
 * @returns {DocumentFragment}
 */
export function cuerpoANodos(bodyEscapado, { enlaceCita = (id) => `#p${id}` } = {}) {
  const frag = document.createDocumentFragment();
  const lineas = desescapar(bodyEscapado).split('\n');

  lineas.forEach((linea, i) => {
    if (i > 0) frag.append('\n');
    const esGreentext = linea.startsWith('>') && !linea.startsWith('>>');
    const destino = esGreentext ? document.createElement('span') : frag;
    if (esGreentext) {
      destino.className = 'greentext';
      frag.append(destino);
    }

    let ultimo = 0;
    for (const m of linea.matchAll(CITA)) {
      destino.append(linea.slice(ultimo, m.index));
      const id = Number(m[1]);
      const href = enlaceCita(id);
      const a = document.createElement('a');
      a.className = href ? 'cita' : 'cita cita--rota';
      a.textContent = m[0];
      a.dataset.cita = String(id);
      if (href) a.setAttribute('href', href);
      destino.append(a);
      ultimo = m.index + m[0].length;
    }
    destino.append(linea.slice(ultimo));
  });

  return frag;
}

const formatoFecha = new Intl.DateTimeFormat('es', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

/** "2026-10-14T03:12:00.000Z" → "14/10/26 03:12" en hora local. */
export function fechaCorta(iso) {
  return formatoFecha.format(new Date(iso)).replace(',', '');
}

/** 312000 → "305 KB" */
export function tamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const NOMBRES_ESTADO = {
  abierto: 'Abierto',
  en_revision: 'En revisión',
  cerrado: 'Cerrado',
};
