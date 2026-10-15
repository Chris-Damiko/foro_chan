import crypto from 'node:crypto';
import { httpError } from './text.js';

/**
 * Middleware para rutas de admin: exige `x-admin-token` igual a ADMIN_TOKEN.
 * Sin token configurado, todas las rutas de admin responden 401.
 */
export function requireAdmin(adminToken) {
  const expected = adminToken ? crypto.createHash('sha256').update(adminToken).digest() : null;
  return (req, res, next) => {
    const given = req.get('x-admin-token');
    if (!expected || !given) return next(httpError(401, 'No autorizado'));
    const hash = crypto.createHash('sha256').update(given).digest();
    if (!crypto.timingSafeEqual(hash, expected)) return next(httpError(401, 'No autorizado'));
    next();
  };
}
