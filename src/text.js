const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Valida un campo de texto del usuario y lo devuelve listo para guardar:
 * saltos de línea normalizados, sin espacios sobrantes en los bordes y con HTML escapado.
 * Los límites se miden sobre el texto original, antes de escapar.
 */
export function cleanText(value, { field, min = 1, max }) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw httpError(400, `El campo ${field} debe ser texto`);
  const text = value.replace(/\r\n?/g, '\n').trim();
  if (text.length < min) {
    throw httpError(400, min === 1 ? `El campo ${field} es obligatorio` : `El campo ${field} es demasiado corto`);
  }
  if (text.length > max) throw httpError(400, `El campo ${field} supera ${max} caracteres`);
  return escapeHtml(text);
}
