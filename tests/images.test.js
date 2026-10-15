import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { detectMime } from '../src/images.js';
import { startTestServer } from './helpers.js';

const red = { width: 600, height: 400, channels: 3, background: '#9b2a22' };
let jpegWithExif;
let png;
let gif;
let webp;

before(async () => {
  jpegWithExif = await sharp({ create: red })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'dato-secreto', Make: 'CamaraX' } })
    .toBuffer();
  png = await sharp({ create: { ...red, width: 100, height: 100 } }).png().toBuffer();
  gif = await sharp({ create: { ...red, width: 50, height: 50 } }).gif().toBuffer();
  webp = await sharp({ create: { ...red, width: 80, height: 60 } }).webp().toBuffer();
});

let srv;

beforeEach(async () => {
  srv = await startTestServer();
});

afterEach(() => srv.close());

test('detectMime reconoce los 4 formatos por magic bytes', () => {
  assert.equal(detectMime(jpegWithExif), 'image/jpeg');
  assert.equal(detectMime(png), 'image/png');
  assert.equal(detectMime(gif), 'image/gif');
  assert.equal(detectMime(webp), 'image/webp');
  assert.equal(detectMime(Buffer.from('<html>hola</html>')), null);
});

test('hilo con imagen: Image completo, archivos en disco y sin EXIF', async () => {
  const { status, body } = await srv.postForm('/api/boards/conf/threads', { title: 't', body: 'b' }, { buffer: jpegWithExif, name: 'IMG_mi_nombre_real.jpg' });
  assert.equal(status, 201);
  const img = body.image;
  assert.equal(img.url, `/uploads/${body.id}.jpg`);
  assert.equal(img.thumbUrl, `/uploads/thumbs/${body.id}.webp`);
  assert.equal(img.mime, 'image/jpeg');
  assert.equal(img.width, 600);
  assert.equal(img.height, 400);
  assert.ok(img.size > 0);

  const saved = await fs.readFile(path.join(srv.uploadsDir, `${body.id}.jpg`));
  assert.equal((await sharp(saved).metadata()).exif, undefined);
  assert.ok(!saved.includes('dato-secreto'));
  assert.ok(!JSON.stringify(srv.store.data).includes('IMG_mi_nombre_real'));

  const thumb = await sharp(path.join(srv.uploadsDir, 'thumbs', `${body.id}.webp`)).metadata();
  assert.equal(thumb.width, 250);
  assert.equal(thumb.height, 167);

  // Se sirve en /uploads.
  const res = await fetch(srv.base + img.url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
});

test('png, gif y webp se aceptan; la miniatura no agranda imágenes chicas', async () => {
  for (const [buffer, ext, w] of [[png, 'png', 100], [gif, 'gif', 50], [webp, 'webp', 80]]) {
    const { status, body } = await srv.postForm('/api/boards/gen/threads', { title: 't', body: 'b' }, { buffer });
    assert.equal(status, 201, ext);
    assert.ok(body.image.url.endsWith(`.${ext}`), ext);
    const thumb = await sharp(path.join(srv.uploadsDir, 'thumbs', `${body.id}.webp`)).metadata();
    assert.equal(thumb.width, w, ext);
  }
});

test('formato falso o archivo dañado da 400; más de 4 MB da 413', async () => {
  const html = await srv.postForm('/api/boards/conf/threads', { title: 't', body: 'b' }, { buffer: Buffer.from('<script>alert(1)</script>'), name: 'x.jpg', type: 'image/jpeg' });
  assert.equal(html.status, 400);
  assert.match(html.body.error, /no permitido/);

  const broken = Buffer.concat([jpegWithExif.subarray(0, 50), Buffer.alloc(100)]);
  assert.equal((await srv.postForm('/api/boards/conf/threads', { title: 't', body: 'b' }, { buffer: broken })).status, 400);

  const big = Buffer.concat([jpegWithExif, Buffer.alloc(4 * 1024 * 1024)]);
  const tooBig = await srv.postForm('/api/boards/conf/threads', { title: 't', body: 'b' }, { buffer: big });
  assert.equal(tooBig.status, 413);
  assert.equal(srv.store.data.threads.length, 0);
});

test('respuesta solo con imagen (sin texto) es válida; sin nada da 400', async () => {
  const { body: thread } = await srv.post('/api/boards/conf/threads', { title: 't', body: 'b' });
  const ok = await srv.postForm(`/api/threads/${thread.id}/replies`, {}, { buffer: png });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.body, '');
  assert.equal(ok.body.image.url, `/uploads/${ok.body.id}.png`);

  assert.equal((await srv.postForm(`/api/threads/${thread.id}/replies`, {})).status, 400);
});

test('multipart: sources llega como JSON en texto', async () => {
  const { status, body } = await srv.postForm('/api/boards/casos/threads', {
    title: 'caso',
    body: 'b',
    sources: JSON.stringify(['https://a.com/nota']),
  });
  assert.equal(status, 201);
  assert.deepEqual(body.sources, ['https://a.com/nota']);

  const bad = await srv.postForm('/api/boards/casos/threads', { title: 'caso', body: 'b', sources: 'https://a.com' });
  assert.equal(bad.status, 400);
});

test('borrar post con imagen borra los archivos', async () => {
  const { body: thread } = await srv.postForm('/api/boards/conf/threads', { title: 't', body: 'b' }, { buffer: png });
  const { body: reply } = await srv.postForm(`/api/threads/${thread.id}/replies`, { body: 'r' }, { buffer: webp });
  const exists = (f) => fs.access(path.join(srv.uploadsDir, f)).then(() => true, () => false);

  await srv.del(`/api/admin/posts/${reply.id}`, srv.admin);
  assert.equal(await exists(`${reply.id}.webp`), false);
  assert.equal(await exists(`thumbs/${reply.id}.webp`), false);
  assert.equal(await exists(`${thread.id}.png`), true);

  await srv.del(`/api/admin/posts/${thread.id}`, srv.admin);
  assert.equal(await exists(`${thread.id}.png`), false);
  assert.equal(await exists(`thumbs/${thread.id}.webp`), false);
});
