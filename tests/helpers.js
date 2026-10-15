import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createStore } from '../src/storage.js';

export const ADMIN_TOKEN = 'token-admin-de-prueba';

/** Levanta la app completa con datos en una carpeta temporal. */
export async function startTestServer({ rateLimits = {} } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'foro-chan-'));
  const store = await createStore({ dir });
  const uploadsDir = path.join(dir, 'uploads');
  const server = createApp({ store, salt: 'sal-de-prueba', adminToken: ADMIN_TOKEN, uploadsDir, rateLimits }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, url, body, extraHeaders = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, headers: res.headers, body: await res.json() };
  };

  /** POST multipart: `fields` como texto y `file` = { buffer, name, type } en el campo image. */
  const postForm = async (url, fields = {}, file) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append('image', new Blob([file.buffer], { type: file.type ?? 'application/octet-stream' }), file.name ?? 'foto.jpg');
    const res = await fetch(base + url, { method: 'POST', body: form });
    return { status: res.status, headers: res.headers, body: await res.json() };
  };

  return {
    store,
    uploadsDir,
    base,
    postForm,
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body),
    patch: (url, body, headers) => request('PATCH', url, body, headers),
    del: (url, headers) => request('DELETE', url, undefined, headers),
    getAdmin: (url) => request('GET', url, undefined, { 'x-admin-token': ADMIN_TOKEN }),
    admin: { 'x-admin-token': ADMIN_TOKEN },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
