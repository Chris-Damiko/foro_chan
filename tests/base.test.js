import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('GET /api/health responde ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('ruta /api desconocida devuelve 404 en JSON', async () => {
  const res = await fetch(`${base}/api/no-existe`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Ruta no encontrada' });
});

test('JSON inválido devuelve 400 en JSON', async () => {
  const res = await fetch(`${base}/api/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{mal',
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'JSON inválido' });
});

test('/uploads inexistente devuelve 404 sin exponer rutas del disco', async () => {
  const res = await fetch(`${base}/uploads/nada.png`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'No encontrado' });
});
