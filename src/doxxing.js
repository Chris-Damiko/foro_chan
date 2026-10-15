import { httpError } from './text.js';

// Los links se ignoran: un id de tweet o de video tiene muchos dígitos y no es un teléfono.
const URL_RE = /\bhttps?:\/\/\S+/gi;
// Fechas y horas se quitan antes de buscar teléfonos ("2026-10-14 19:30" no es un número).
const DATE_TIME_RE = /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}:\d{2}(:\d{2})?\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
// 9 o más dígitos seguidos, con separadores comunes. Una fecha (2026-10-14) tiene 8 y no entra.
const PHONE_RE = /(?<![\w>])\+?\d(?:[\s\-.()]{0,2}\d){8,}(?!\w)/;

/** Devuelve 'email' o 'teléfono' si el texto parece tener un dato personal; si no, null. */
export function findPersonalData(text) {
  // El texto llega con HTML escapado: ">>123" viene como "&gt;&gt;123".
  const clean = text.replace(/&gt;/g, '>').replace(URL_RE, ' ').replace(DATE_TIME_RE, ' ');
  if (EMAIL_RE.test(clean)) return 'email';
  if (PHONE_RE.test(clean)) return 'teléfono';
  return null;
}

/** Lanza 400 si alguno de los textos parece tener un email o un teléfono. */
export function rejectPersonalData(...texts) {
  for (const text of texts) {
    const kind = text && findPersonalData(text);
    if (kind) {
      throw httpError(
        400,
        `Tu mensaje parece incluir un ${kind}. No publiques datos personales de nadie.`,
      );
    }
  }
}
