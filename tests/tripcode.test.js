import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, tripcode } from '../src/tripcode.js';
import { startTestServer } from './helpers.js';

test('parseName: nombre, nombre#clave, #clave y vacío', () => {
  assert.deepEqual(parseName(undefined, 's'), {});
  assert.deepEqual(parseName('', 's'), {});
  assert.deepEqual(parseName('mobbu', 's'), { name: 'mobbu' });
  const a = parseName('mobbu#clave', 's');
  assert.equal(a.name, 'mobbu');
  assert.match(a.tripcode, /^![A-Za-z0-9_-]{10}$/);
  assert.deepEqual(parseName('#clave', 's'), { tripcode: a.tripcode });
  // La clave puede llevar # dentro: solo se corta en el primero.
  assert.notEqual(parseName('x#a#b', 's').tripcode, parseName('x#a', 's').tripcode);
});

test('tripcode: estable con la misma clave y secreto; cambia si cambia cualquiera', () => {
  assert.equal(tripcode('clave', 's1'), tripcode('clave', 's1'));
  assert.notEqual(tripcode('clave', 's1'), tripcode('clave2', 's1'));
  assert.notEqual(tripcode('clave', 's1'), tripcode('clave', 's2'));
});

test('parseName: nombre escapado y con límite de 30', () => {
  assert.equal(parseName('<b>', 's').name, '&lt;b&gt;');
  assert.throws(() => parseName('x'.repeat(31), 's'), /30/);
  assert.throws(() => parseName(5, 's'), /texto/);
});

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

test('API: hilo y respuesta con name y tripcode; la clave no se guarda', async () => {
  const { status, body: t } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b', name: 'mobbu#superclave' });
  assert.equal(status, 201);
  assert.equal(t.name, 'mobbu');
  assert.match(t.tripcode, /^!.{10}$/);

  const { body: r } = await srv.post(`/api/threads/${t.id}/replies`, { body: 'r', name: 'otro#superclave' });
  assert.equal(r.tripcode, t.tripcode);
  assert.equal(r.name, 'otro');

  const { body: anon } = await srv.post(`/api/threads/${t.id}/replies`, { body: 'r' });
  assert.equal('name' in anon, false);
  assert.equal('tripcode' in anon, false);

  assert.ok(!JSON.stringify(srv.store.data).includes('superclave'));
});

test('API: name con teléfono da 400', async () => {
  const { status } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b', name: 'llama 0991234567' });
  assert.equal(status, 400);
});

test('API: ban de tripcode bloquea publicar (403) y el unban lo libera', async () => {
  const { body: t } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b', name: 'troll#clave' });
  const trip = t.tripcode;

  assert.equal((await srv.post(`/api/admin/tripcodes/${trip.slice(1)}/ban`, {})).status, 401);
  const ban = await srv.request('POST', `/api/admin/tripcodes/${encodeURIComponent(trip)}/ban`, {}, srv.admin);
  assert.deepEqual(ban.body, { ok: true });

  const blocked = await srv.post(`/api/threads/${t.id}/replies`, { body: 'r', name: 'troll#clave' });
  assert.equal(blocked.status, 403);
  assert.match(blocked.body.error, /bloqueada/);
  // Sin firma, o con otra clave, sí puede publicar.
  assert.equal((await srv.post(`/api/threads/${t.id}/replies`, { body: 'r' })).status, 201);

  const unban = await srv.request('DELETE', `/api/admin/tripcodes/${trip.slice(1)}/ban`, undefined, srv.admin);
  assert.equal(unban.status, 200);
  assert.equal((await srv.post(`/api/threads/${t.id}/replies`, { body: 'r', name: 'troll#clave' })).status, 201);
});

test('API: tripcode con formato inválido en el ban da 400', async () => {
  const r = await srv.request('POST', '/api/admin/tripcodes/corto/ban', {}, srv.admin);
  assert.equal(r.status, 400);
});
