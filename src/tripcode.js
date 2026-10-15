import crypto from 'node:crypto';
import { cleanText, httpError } from './text.js';

export const MAX_NAME = 30;
const TRIP_RE = /^!?([A-Za-z0-9_-]{10})$/;

/**
 * Lee el campo opcional `name` ("nombre", "nombre#clave" o "#clave").
 * Devuelve { name?, tripcode? }. La clave solo se usa para calcular el HMAC y se descarta.
 */
export function parseName(raw, secret) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (typeof raw !== 'string') throw httpError(400, 'El campo name debe ser texto');

  const hash = raw.indexOf('#');
  const namePart = hash === -1 ? raw : raw.slice(0, hash);
  const key = hash === -1 ? '' : raw.slice(hash + 1);

  const result = {};
  const name = cleanText(namePart, { field: 'name', min: 0, max: MAX_NAME });
  if (name) result.name = name;
  if (key) result.tripcode = tripcode(key, secret);
  return result;
}

export function tripcode(key, secret) {
  return '!' + crypto.createHmac('sha256', secret).update(key).digest('base64url').slice(0, 10);
}

/** Normaliza un tripcode recibido en la URL ("Ab3dE9xQ2k" o "!Ab3dE9xQ2k"); 400 si no tiene el formato. */
export function normalizeTripcode(value) {
  const m = TRIP_RE.exec(value ?? '');
  if (!m) throw httpError(400, 'Tripcode inválido');
  return '!' + m[1];
}
