import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/rateLimit.js';
import { startTestServer } from './helpers.js';

function fakeClock() {
  let t = 1_000_000;
  const now = () => t;
  now.advance = (ms) => (t += ms);
  return now;
}

test('bloquea antes de la espera y deja pasar después', () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ reply: 15_000 }, clock);
  limiter.take('reply', '1.1.1.1');
  clock.advance(14_000);
  assert.throws(() => limiter.take('reply', '1.1.1.1'), (err) => {
    assert.equal(err.status, 429);
    assert.equal(err.retryAfter, 1);
    return true;
  });
  clock.advance(1_000);
  assert.doesNotThrow(() => limiter.take('reply', '1.1.1.1'));
});

test('cada IP y cada acción tienen su propio contador', () => {
  const limiter = createRateLimiter({ thread: 60_000, reply: 15_000 }, fakeClock());
  limiter.take('thread', 'a');
  assert.doesNotThrow(() => limiter.take('thread', 'b'));
  assert.doesNotThrow(() => limiter.take('reply', 'a'));
});

test('undo libera el turno', () => {
  const limiter = createRateLimiter({ reply: 15_000 }, fakeClock());
  const undo = limiter.take('reply', 'a');
  undo();
  assert.doesNotThrow(() => limiter.take('reply', 'a'));
});

test('acción sin límite configurado nunca bloquea', () => {
  const limiter = createRateLimiter({}, fakeClock());
  limiter.take('reply', 'a');
  assert.doesNotThrow(() => limiter.take('reply', 'a'));
});

test('API: segundo hilo seguido da 429 con Retry-After; un error de validación no gasta el turno', async () => {
  const srv = await startTestServer({ rateLimits: { thread: 60_000, reply: 15_000 } });
  try {
    const bad = await srv.post('/api/boards/conf/threads', { title: '', body: 'x' });
    assert.equal(bad.status, 400);

    const ok = await srv.post('/api/boards/conf/threads', { title: 't', body: 'x' });
    assert.equal(ok.status, 201);

    const again = await srv.post('/api/boards/gen/threads', { title: 't', body: 'x' });
    assert.equal(again.status, 429);
    assert.match(again.body.error, /Espera \d+ s/);
    assert.ok(Number(again.headers.get('retry-after')) > 0);

    // Responder es otra acción: sí se permite.
    const reply = await srv.post(`/api/threads/${ok.body.id}/replies`, { body: 'r' });
    assert.equal(reply.status, 201);
    const reply2 = await srv.post(`/api/threads/${ok.body.id}/replies`, { body: 'r' });
    assert.equal(reply2.status, 429);
  } finally {
    await srv.close();
  }
});

test('API: peticiones simultáneas de la misma IP: solo pasa una', async () => {
  const srv = await startTestServer({ rateLimits: { thread: 60_000 } });
  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => srv.post('/api/boards/conf/threads', { title: 't', body: 'x' })),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 429, 429, 429, 429]);
  } finally {
    await srv.close();
  }
});
