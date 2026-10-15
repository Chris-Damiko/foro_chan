import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { findPersonalData } from '../src/doxxing.js';
import { startTestServer } from './helpers.js';

test('anti-doxxing: detecta emails y teléfonos', () => {
  for (const text of [
    'escríbele a fulano@gmail.com',
    'su número es 0991234567',
    'llama al +593 99 123 4567',
    'tel (02) 234-5678-9',
    'cédula 1712345678',
  ]) {
    assert.ok(findPersonalData(text), text);
  }
});

test('anti-doxxing: no confunde fechas, citas, links ni números cortos', () => {
  for (const text of [
    'pasó el 2026-10-14 a las 19:30',
    'subido 2026-10-14 19:30:05',
    'el 14/10/2026 22:15 dijo eso',
    '&gt;&gt;123456789 eso es mentira',
    'mira https://x.com/user/status/1846123456789012345',
    'tiene 12345 suscriptores',
    'el video dura 1:02:33',
  ]) {
    assert.equal(findPersonalData(text), null, text);
  }
});

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

test('API: hilo o respuesta con teléfono o email da 400', async () => {
  const t = await srv.post('/api/boards/conf/threads', { title: 'hola', body: 'su cel es 0991234567' });
  assert.equal(t.status, 400);
  assert.match(t.body.error, /teléfono/);

  const ok = await srv.post('/api/boards/conf/threads', { title: 'hola', body: 'texto' });
  const r = await srv.post(`/api/threads/${ok.body.id}/replies`, { body: 'a@b.com' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /email/);
});

async function threadWithReply() {
  const { body: thread } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b' });
  const { body: reply } = await srv.post(`/api/threads/${thread.id}/replies`, { body: 'r' });
  return { thread, reply };
}

test('reportar: guarda el reporte y el admin lo ve primero el más nuevo', async () => {
  const { thread, reply } = await threadWithReply();
  assert.deepEqual((await srv.post(`/api/posts/${reply.id}/report`, { reason: 'spam' })).body, { ok: true });
  assert.equal((await srv.post(`/api/posts/${thread.id}/report`, { reason: '<b>doxxing</b>' })).status, 200);

  const { status, body } = await srv.getAdmin('/api/admin/reports');
  assert.equal(status, 200);
  assert.equal(body.length, 2);
  assert.equal(body[0].postId, thread.id);
  assert.equal(body[0].reason, '&lt;b&gt;doxxing&lt;/b&gt;');
  assert.equal(body[1].postId, reply.id);
  assert.equal(body[1].threadId, thread.id);
  assert.ok(body[1].id && body[1].createdAt);
});

test('reportar: 400 sin motivo, 404 si no existe', async () => {
  const { reply } = await threadWithReply();
  assert.equal((await srv.post(`/api/posts/${reply.id}/report`, {})).status, 400);
  assert.equal((await srv.post(`/api/posts/${reply.id}/report`, { reason: 'x'.repeat(501) })).status, 400);
  assert.equal((await srv.post('/api/posts/999/report', { reason: 'x' })).status, 404);
});

test('admin: sin token da 401', async () => {
  const { reply } = await threadWithReply();
  assert.equal((await srv.get('/api/admin/reports')).status, 401);
  assert.equal((await srv.del(`/api/admin/posts/${reply.id}`)).status, 401);
});

test('borrar respuesta: queda con deleted, body vacío, y se van sus reportes', async () => {
  const { thread, reply } = await threadWithReply();
  await srv.post(`/api/posts/${reply.id}/report`, { reason: 'x' });

  const del = await srv.del(`/api/admin/posts/${reply.id}`, srv.admin);
  assert.deepEqual(del.body, { ok: true });

  const { body } = await srv.get(`/api/threads/${thread.id}`);
  assert.deepEqual(body.replies, [{ ...reply, body: '', deleted: true }]);
  assert.equal(body.thread.replyCount, 1);
  assert.deepEqual((await srv.getAdmin('/api/admin/reports')).body, []);

  // Una respuesta ya borrada no se puede borrar ni reportar de nuevo.
  assert.equal((await srv.del(`/api/admin/posts/${reply.id}`, srv.admin)).status, 404);
  assert.equal((await srv.post(`/api/posts/${reply.id}/report`, { reason: 'x' })).status, 404);
});

test('borrar OP: se borra el hilo entero, sus respuestas y sus reportes', async () => {
  const { thread, reply } = await threadWithReply();
  const other = await threadWithReply();
  await srv.post(`/api/posts/${reply.id}/report`, { reason: 'x' });
  await srv.post(`/api/posts/${other.reply.id}/report`, { reason: 'y' });

  assert.equal((await srv.del(`/api/admin/posts/${thread.id}`, srv.admin)).status, 200);
  assert.equal((await srv.get(`/api/threads/${thread.id}`)).status, 404);
  assert.equal(srv.store.data.posts.some((p) => p.threadId === thread.id), false);

  const reports = (await srv.getAdmin('/api/admin/reports')).body;
  assert.deepEqual(reports.map((r) => r.postId), [other.reply.id]);
  assert.equal((await srv.get('/api/boards')).body.find((b) => b.id === 'conf').threadCount, 1);
});
