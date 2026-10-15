// Cliente de la API (contrato en docs/api.md).
// Cada función devuelve { ok, status, data, error }: nunca lanza por errores HTTP.

async function pedir(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(ruta, { credentials: 'same-origin', ...opciones });
  } catch {
    return { ok: false, status: 0, data: null, error: 'Sin conexión con el servidor.' };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Respuesta sin JSON (no debería pasar en /api).
  }

  if (res.ok) return { ok: true, status: res.status, data, error: null };

  let error = data?.error || 'Algo salió mal.';
  if (res.status === 429) {
    const espera = Number(res.headers.get('Retry-After'));
    error = espera > 0
      ? `Vas muy rápido. Espera ${espera} s antes de volver a publicar.`
      : 'Vas muy rápido. Espera un momento antes de volver a publicar.';
  } else if (res.status === 413) {
    error = 'La imagen pesa más de 4 MB.';
  }
  return { ok: false, status: res.status, data, error };
}

function enviarJson(ruta, cuerpo) {
  return pedir(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

export function obtenerTableros() {
  return pedir('/api/boards');
}

export function obtenerHilos(tablero, pagina = 1) {
  return pedir(`/api/boards/${encodeURIComponent(tablero)}/threads?page=${pagina}`);
}

export function obtenerHilo(id) {
  return pedir(`/api/threads/${encodeURIComponent(id)}`);
}

/**
 * Crea un hilo. Con imagen usa multipart; sin imagen, JSON.
 * @param {string} tablero
 * @param {{ title: string, body: string, name?: string, sources?: string[], image?: File }} datos
 *   name: "nombre", "nombre#clave" o "#clave" (tripcode). Vacío = Anónimo.
 */
export function crearHilo(tablero, { title, body, name, sources, image }) {
  const ruta = `/api/boards/${encodeURIComponent(tablero)}/threads`;
  if (!image) {
    const cuerpo = { title, body };
    if (name) cuerpo.name = name;
    if (sources?.length) cuerpo.sources = sources;
    return enviarJson(ruta, cuerpo);
  }
  const form = new FormData();
  form.append('title', title);
  form.append('body', body);
  if (name) form.append('name', name);
  if (sources?.length) form.append('sources', JSON.stringify(sources));
  form.append('image', image);
  // Sin Content-Type a mano: el navegador pone el boundary.
  return pedir(ruta, { method: 'POST', body: form });
}

/**
 * Responde en un hilo. Necesita body o image.
 * @param {number|string} hiloId
 * @param {{ body?: string, name?: string, image?: File }} datos
 */
export function responder(hiloId, { body = '', name, image }) {
  const ruta = `/api/threads/${encodeURIComponent(hiloId)}/replies`;
  if (!image) return enviarJson(ruta, name ? { body, name } : { body });
  const form = new FormData();
  form.append('body', body);
  if (name) form.append('name', name);
  form.append('image', image);
  return pedir(ruta, { method: 'POST', body: form });
}

export function reportar(postId, reason) {
  return enviarJson(`/api/posts/${encodeURIComponent(postId)}/report`, { reason });
}

// ---------- Admin (cookie HttpOnly dd_admin, Path=/api/admin) ----------

export function entrarAdmin(password) {
  return enviarJson('/api/admin/login', { password });
}

export function salirAdmin() {
  return pedir('/api/admin/logout', { method: 'POST' });
}

/** true si hay sesión de admin. No hay /me: se prueba con una ruta de solo lectura. */
export async function estadoAdmin() {
  const res = await pedir('/api/admin/reports');
  return res.ok;
}
