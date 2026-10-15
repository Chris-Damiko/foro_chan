import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createStore } from '../src/storage.js';

/** Levanta la app completa con datos en una carpeta temporal. */
export async function startTestServer({ rateLimits = {} } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'foro-chan-'));
  const store = await createStore({ dir });
  const server = createApp({ store, salt: 'sal-de-prueba', rateLimits }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, headers: res.headers, body: await res.json() };
  };

  return {
    store,
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
