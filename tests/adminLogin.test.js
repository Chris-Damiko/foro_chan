import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN, startTestServer } from './helpers.js';

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

const cookieOf = (res) => res.headers.get('set-cookie') ?? '';

test('login correcto: cookie HttpOnly, SameSite=Strict, Path=/api/admin, sin el token dentro', async () => {
  const res = await srv.post('/api/admin/login', { password: ADMIN_TOKEN });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  const cookie = cookieOf(res);
  assert.match(cookie, /^dd_admin=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/admin/);
  assert.ok(!cookie.includes(ADMIN_TOKEN));
});

test('login incorrecto o sin contraseña: 401 y sin cookie', async () => {
  for (const body of [{ password: 'mal' }, {}, { password: 5 }]) {
    const res = await srv.post('/api/admin/login', body);
    assert.equal(res.status, 401, JSON.stringify(body));
    assert.equal(cookieOf(res), '');
  }
});

test('la cookie da acceso al admin y el logout lo quita', async () => {
  const login = await srv.post('/api/admin/login', { password: ADMIN_TOKEN });
  const cookie = cookieOf(login).split(';')[0];

  const ok = await srv.request('GET', '/api/admin/reports', undefined, { cookie });
  assert.equal(ok.status, 200);

  const out = await srv.request('POST', '/api/admin/logout', undefined, { cookie });
  assert.equal(out.status, 200);
  assert.match(cookieOf(out), /dd_admin=;/);

  const after = await srv.request('GET', '/api/admin/reports', undefined, { cookie });
  assert.equal(after.status, 401);
});

test('una cookie inventada no da acceso', async () => {
  const res = await srv.request('GET', '/api/admin/reports', undefined, { cookie: 'dd_admin=inventado' });
  assert.equal(res.status, 401);
});

test('con rate limit: un intento fallido frena el siguiente (429)', async () => {
  const limited = await startTestServer({ rateLimits: { adminLogin: 3000 } });
  try {
    assert.equal((await limited.post('/api/admin/login', { password: 'mal' })).status, 401);
    assert.equal((await limited.post('/api/admin/login', { password: ADMIN_TOKEN })).status, 429);
  } finally {
    await limited.close();
  }
});

test('la cookie sirve para cambiar el estado de un caso por /api/admin/threads/:id/status', async () => {
  const login = await srv.post('/api/admin/login', { password: ADMIN_TOKEN });
  const cookie = cookieOf(login).split(';')[0];
  const { body: c } = await srv.post('/api/boards/casos/threads', { title: 'c', body: 'b', sources: ['https://a.com'] });
  const res = await srv.request('PATCH', `/api/admin/threads/${c.id}/status`, { status: 'cerrado' }, { cookie });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'cerrado');
});
