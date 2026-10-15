import { httpError } from './text.js';

/** Espera mínima entre acciones de la misma IP, en milisegundos (contrato en docs/api.md). */
export const DEFAULT_LIMITS = {
  thread: 60_000,
  reply: 15_000,
  report: 10_000,
  adminLogin: 3_000, // frena la fuerza bruta contra ADMIN_TOKEN
};

const MAX_ENTRIES = 10_000;

/**
 * Rate limit en memoria por IP y acción. Se reinicia al reiniciar el servidor,
 * y la IP solo vive en memoria (nunca se escribe a disco).
 *
 * Uso: `const undo = limiter.take(action, ip)` antes de procesar. Lanza 429 si es muy
 * pronto; si no, reserva el turno en el acto (dos peticiones simultáneas no pasan las dos).
 * Si la acción falla después (ej. error de validación), llamar `undo()` para no castigar al usuario.
 */
export function createRateLimiter(limits = DEFAULT_LIMITS, now = Date.now) {
  const last = new Map();

  function prune() {
    const maxWindow = Math.max(...Object.values(limits));
    const t = now();
    for (const [key, at] of last) if (t - at >= maxWindow) last.delete(key);
  }

  return {
    take(action, ip) {
      const wait = limits[action];
      if (!wait) return () => {};
      const key = `${action}|${ip}`;
      const prev = last.get(key);
      const t = now();
      if (prev !== undefined && t - prev < wait) {
        const seconds = Math.ceil((wait - (t - prev)) / 1000);
        const err = httpError(429, `Espera ${seconds} s antes de volver a intentarlo`);
        err.retryAfter = seconds;
        throw err;
      }
      if (last.size >= MAX_ENTRIES) prune();
      last.set(key, t);
      return () => {
        if (last.get(key) !== t) return;
        if (prev === undefined) last.delete(key);
        else last.set(key, prev);
      };
    },
  };
}
