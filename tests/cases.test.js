import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

const newCase = (extra = {}) =>
  srv.post('/api/boards/casos/threads', { title: 'Caso', body: 'Resumen', sources: ['https://ejemplo.com/nota'], ...extra });

test('caso nuevo: status abierto, statusHistory inicial y fuentes', async () => {
  const { status, body } = await newCase();
  assert.equal(status, 201);
  assert.equal(body.status, 'abierto');
  assert.deepEqual(body.statusHistory, [{ status: 'abierto', at: body.createdAt }]);
  assert.deepEqual(body.sources, ['https://ejemplo.com/nota']);
});

test('caso sin fuentes da 400', async () => {
  for (const sources of [undefined, [], ['  ']]) {
    const { status, body } = await newCase({ sources });
    assert.equal(status, 400, JSON.stringify(sources));
    assert.match(body.error, /al menos una fuente/);
  }
});

test('fuentes inválidas dan 400', async () => {
  for (const sources of ['https://a.com', ['no es url'], ['javascript:alert(1)'], ['ftp://a.com'], [5]]) {
    const { status } = await newCase({ sources });
    assert.equal(status, 400, JSON.stringify(sources));
  }
  const many = Array.from({ length: 11 }, (_, i) => `https://a.com/${i}`);
  assert.match((await newCase({ sources: many })).body.error, /Máximo 10/);
});

test('fuentes se normalizan y no se repiten', async () => {
  const { body } = await newCase({ sources: [' https://A.com ', 'https://a.com/', 'http://b.com/x?y=1'] });
  assert.deepEqual(body.sources, ['https://a.com/', 'http://b.com/x?y=1']);
});

test('otros tableros: sin status; sources opcional', async () => {
  const { body: plain } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b' });
  assert.equal(plain.status, undefined);
  assert.equal(plain.statusHistory, undefined);
  assert.equal(plain.sources, undefined);

  const { body: withSrc } = await srv.post('/api/boards/gen/threads', { title: 't', body: 'b', sources: ['https://a.com'] });
  assert.deepEqual(withSrc.sources, ['https://a.com/']);
  assert.equal(withSrc.status, undefined);
});

test('PATCH status: cambia el estado y agrega al historial', async () => {
  const { body: c } = await newCase();
  const r1 = await srv.patch(`/api/threads/${c.id}/status`, { status: 'en_revision' }, srv.admin);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.status, 'en_revision');
  const r2 = await srv.patch(`/api/threads/${c.id}/status`, { status: 'cerrado' }, srv.admin);
  assert.deepEqual(r2.body.statusHistory.map((h) => h.status), ['abierto', 'en_revision', 'cerrado']);

  const { body } = await srv.get(`/api/threads/${c.id}`);
  assert.equal(body.thread.status, 'cerrado');
  assert.equal(body.thread.statusHistory.length, 3);
});

test('PATCH status: sin token o con token incorrecto da 401', async () => {
  const { body: c } = await newCase();
  assert.equal((await srv.patch(`/api/threads/${c.id}/status`, { status: 'cerrado' })).status, 401);
  const wrong = await srv.patch(`/api/threads/${c.id}/status`, { status: 'cerrado' }, { 'x-admin-token': 'mal' });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error, 'No autorizado');
});

test('PATCH status: errores 400 y 404', async () => {
  const { body: c } = await newCase();
  const { body: conf } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b' });
  const patch = (id, status) => srv.patch(`/api/threads/${id}/status`, { status }, srv.admin);

  assert.equal((await patch(c.id, 'inventado')).status, 400);
  assert.equal((await patch(c.id, 'abierto')).status, 400); // ya está abierto
  assert.equal((await patch(conf.id, 'cerrado')).status, 400); // no es de casos
  assert.equal((await patch(999, 'cerrado')).status, 404);
});
