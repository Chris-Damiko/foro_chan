import { httpError } from './text.js';

export const CASES_BOARD = 'casos';
export const STATUSES = ['abierto', 'en_revision', 'cerrado'];
const MAX_SOURCES = 10;
const MAX_URL_LENGTH = 2000;

/**
 * Valida la lista de fuentes. Devuelve las URLs normalizadas (`URL.href`), sin duplicados.
 * Las URLs no se escapan como HTML: el frontend las pone en un atributo `href`.
 */
export function cleanSources(value, { required }) {
  if (value === undefined || value === null) value = [];
  if (!Array.isArray(value)) throw httpError(400, 'El campo sources debe ser una lista de URLs');

  const urls = [];
  for (const raw of value) {
    if (typeof raw !== 'string') throw httpError(400, 'Cada fuente debe ser una URL');
    const text = raw.trim();
    if (!text) continue;
    let url;
    try {
      url = new URL(text);
    } catch {
      throw httpError(400, `Fuente inválida: ${text.slice(0, 100)}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw httpError(400, 'Las fuentes deben ser links http o https');
    }
    if (url.href.length > MAX_URL_LENGTH) throw httpError(400, 'Fuente demasiado larga');
    if (!urls.includes(url.href)) urls.push(url.href);
  }

  if (urls.length > MAX_SOURCES) throw httpError(400, `Máximo ${MAX_SOURCES} fuentes`);
  if (required && urls.length === 0) {
    throw httpError(400, 'Los hilos de Casos necesitan al menos una fuente');
  }
  return urls;
}

export function parseStatus(value) {
  if (!STATUSES.includes(value)) {
    throw httpError(400, `status debe ser uno de: ${STATUSES.join(', ')}`);
  }
  return value;
}
