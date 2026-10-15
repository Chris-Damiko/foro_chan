import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

const newThread = (board = 'conf', extra = {}) =>
  srv.post(`/api/boards/${board}/threads`, { title: 'Título', body: 'Texto', ...extra });

test('GET /api/boards lista los 3 tableros con threadCount', async () => {
  await newThread('conf');
  await newThread('conf');
  await newThread('gen');
  const { status, body } = await srv.get('/api/boards');
  assert.equal(status, 200);
  assert.deepEqual(
    body.map((b) => [b.id, b.threadCount]),
    [['conf', 2], ['casos', 0], ['gen', 1]],
  );
  assert.ok(body.every((b) => b.name && b.description));
});

test('crear hilo devuelve 201 con todos los campos', async () => {
  const { status, body } = await newThread();
  assert.equal(status, 201);
  assert.equal(body.id, 1);
  assert.equal(body.board, 'conf');
  assert.equal(body.title, 'Título');
  assert.equal(body.body, 'Texto');
  assert.equal(body.replyCount, 0);
  assert.equal(body.anonId.length, 8);
  assert.equal(body.createdAt, body.bumpedAt);
  assert.ok(!Number.isNaN(Date.parse(body.createdAt)));
});

test('crear hilo en tablero inexistente da 404', async () => {
  const { status, body } = await newThread('nope');
  assert.equal(status, 404);
  assert.ok(body.error);
});

test('validación: title y body obligatorios y con límite', async () => {
  for (const [input, msg] of [
    [{ title: '', body: 'x' }, /title.*obligatorio/],
    [{ title: 'x', body: '   ' }, /body.*obligatorio/],
    [{ title: 'x'.repeat(101), body: 'x' }, /title.*100/],
    [{ title: 'x', body: 'x'.repeat(4001) }, /body.*4000/],
    [{ title: 5, body: 'x' }, /title.*texto/],
  ]) {
    const { status, body } = await srv.post('/api/boards/conf/threads', input);
    assert.equal(status, 400, JSON.stringify(input));
    assert.match(body.error, msg);
  }
});

test('el texto se guarda con HTML escapado y saltos de línea normalizados', async () => {
  const { body } = await newThread('conf', { title: '<b>hola</b>', body: '>greentext\r\n<script>x</script>' });
  assert.equal(body.title, '&lt;b&gt;hola&lt;/b&gt;');
  assert.equal(body.body, '&gt;greentext\n&lt;script&gt;x&lt;/script&gt;');
});

test('responder: 201, bump y replyCount; mismo anonId para la misma IP en el hilo', async () => {
  const { body: thread } = await newThread();
  const { status, body: reply } = await srv.post(`/api/threads/${thread.id}/replies`, { body: '>>1 lo vi' });
  assert.equal(status, 201);
  assert.equal(reply.id, 2);
  assert.equal(reply.threadId, thread.id);
  assert.equal(reply.body, '&gt;&gt;1 lo vi');
  assert.equal(reply.anonId, thread.anonId);

  const { body: full } = await srv.get(`/api/threads/${thread.id}`);
  assert.equal(full.thread.replyCount, 1);
  assert.equal(full.thread.bumpedAt, reply.createdAt);
  assert.deepEqual(full.replies, [reply]);
});

test('anonId distinto entre hilos', async () => {
  const { body: a } = await newThread();
  const { body: b } = await newThread();
  assert.notEqual(a.anonId, b.anonId);
});

test('hilo o respuesta a hilo inexistente: 404', async () => {
  for (const url of ['/api/threads/99', '/api/threads/abc', '/api/threads/0']) {
    assert.equal((await srv.get(url)).status, 404, url);
  }
  assert.equal((await srv.post('/api/threads/99/replies', { body: 'x' })).status, 404);
});

test('respuesta sin body da 400', async () => {
  const { body: thread } = await newThread();
  const { status } = await srv.post(`/api/threads/${thread.id}/replies`, {});
  assert.equal(status, 400);
});

test('catálogo: orden por bump, 20 por página, body recortado', async () => {
  const ids = [];
  for (let i = 0; i < 25; i++) ids.push((await newThread('gen', { body: 'a'.repeat(500) })).body.id);
  // Responder al primero lo sube al tope.
  await srv.post(`/api/threads/${ids[0]}/replies`, { body: 'bump' });

  const p1 = (await srv.get('/api/boards/gen/threads')).body;
  assert.equal(p1.page, 1);
  assert.equal(p1.totalPages, 2);
  assert.equal(p1.threads.length, 20);
  assert.equal(p1.threads[0].id, ids[0]);
  assert.equal(p1.threads[1].id, ids[24]);
  assert.equal(p1.threads[0].body.length, 300);

  const p2 = (await srv.get('/api/boards/gen/threads?page=2')).body;
  assert.equal(p2.threads.length, 5);
  assert.equal((await srv.get('/api/boards/gen/threads?page=9')).body.threads.length, 0);
  assert.equal((await srv.get('/api/boards/gen/threads?page=abc')).body.page, 1);
});

test('el recorte del catálogo no corta entidades HTML', async () => {
  await newThread('gen', { body: 'a'.repeat(298) + '<<<' });
  const [t] = (await srv.get('/api/boards/gen/threads')).body.threads;
  assert.equal(t.body, 'a'.repeat(298));
});

test('tablero vacío: una página sin hilos', async () => {
  const { status, body } = await srv.get('/api/boards/casos/threads');
  assert.equal(status, 200);
  assert.deepEqual(body, { threads: [], page: 1, totalPages: 1 });
});

test('respuestas simultáneas no pierden replyCount', async () => {
  const { body: thread } = await newThread();
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => srv.post(`/api/threads/${thread.id}/replies`, { body: `r${i}` })),
  );
  const { body } = await srv.get(`/api/threads/${thread.id}`);
  assert.equal(body.thread.replyCount, 20);
  assert.equal(new Set(body.replies.map((r) => r.id)).size, 20);
});
