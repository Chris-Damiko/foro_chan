import crypto from 'node:crypto';
import express from 'express';
import { httpError } from './text.js';

export const COOKIE_NAME = 'dd_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest();

function readCookie(req, name) {
  for (const part of (req.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

/**
 * Autenticación del admin. Dos formas de entrar:
 * - Cabecera `x-admin-token` igual a ADMIN_TOKEN (tests y consola).
 * - Cookie de sesión creada por POST /api/admin/login. La cookie lleva un token
 *   aleatorio; el servidor guarda solo su hash, en memoria, y expira a las 12 h.
 * Sin ADMIN_TOKEN configurado, todo responde 401.
 */
export function createAdminAuth(adminToken, { limiter, now = Date.now } = {}) {
  const expected = adminToken ? sha256(adminToken) : null;
  const sessions = new Map(); // hash hex del token → vence (ms)

  const tokenMatches = (given) => expected && given && crypto.timingSafeEqual(sha256(given), expected);

  function sessionValid(token) {
    if (!token) return false;
    const key = sha256(token).toString('hex');
    const expires = sessions.get(key);
    if (expires === undefined) return false;
    if (expires <= now()) {
      sessions.delete(key);
      return false;
    }
    return true;
  }

  /** Middleware para las rutas de admin. */
  function require(req, res, next) {
    if (!expected) return next(httpError(401, 'No autorizado'));
    if (tokenMatches(req.get('x-admin-token')) || sessionValid(readCookie(req, COOKIE_NAME))) return next();
    next(httpError(401, 'No autorizado'));
  }

  const router = express.Router();

  router.post('/admin/login', (req, res) => {
    const undo = limiter?.take('adminLogin', req.ip) ?? (() => {});
    const password = req.body?.password;
    if (typeof password !== 'string' || !tokenMatches(password)) {
      throw httpError(401, 'Contraseña incorrecta');
    }
    undo(); // un login correcto no gasta el turno
    for (const [key, expires] of sessions) if (expires <= now()) sessions.delete(key);

    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(sha256(token).toString('hex'), now() + SESSION_MS);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/admin',
      secure: req.secure || process.env.NODE_ENV === 'production',
      maxAge: SESSION_MS,
    });
    res.json({ ok: true });
  });

  router.post('/admin/logout', (req, res) => {
    const token = readCookie(req, COOKIE_NAME);
    if (token) sessions.delete(sha256(token).toString('hex'));
    res.clearCookie(COOKIE_NAME, { path: '/api/admin' });
    res.json({ ok: true });
  });

  return { require, router };
}
