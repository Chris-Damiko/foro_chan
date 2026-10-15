import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { syncHearted, syncQueridoDross, videosToRefresh } from '../src/youtube.js';
import { startTestServer } from './helpers.js';

let thumb;
let srv;

beforeEach(async () => {
  thumb ??= await sharp({ create: { width: 480, height: 360, channels: 3, background: '#000' } }).jpeg().toBuffer();
  srv = await startTestServer();
});

afterEach(() => srv.close());

/** Fuente falsa: lista del más nuevo al más viejo, como yt-dlp. */
function fakeSource(videos, { failThumb = false } = {}) {
  return {
    calls: 0,
    async list() {
      this.calls += 1;
      return videos;
    },
    async publishedAt(id) {
      return id === 'sinFecha___' ? undefined : '2026-10-11T12:00:00.000Z';
    },
    async thumbnail() {
      if (failThumb) throw new Error('sin red');
      return thumb;
    },
  };
}

const VIDEOS = [
  { id: 'gU3R44hr3mY', title: 'Querido Dross: Asistí A Una Muerte' },
  { id: 'aaaaaaaaaaa', title: '7 historias de terror' },
  { id: '_UqxoLmydas', title: 'querido dross: El Hombre del <Sombrero>' },
];

test('crea un hilo por video "Querido Dross", del más viejo al más nuevo', async () => {
  const created = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source: fakeSource(VIDEOS) });
  assert.equal(created.length, 2);
  assert.deepEqual(created.map((t) => t.video.id), ['_UqxoLmydas', 'gU3R44hr3mY']);

  const t = created[0];
  assert.equal(t.board, 'qd');
  assert.equal(t.system, true);
  assert.equal(t.title, 'querido dross: El Hombre del &lt;Sombrero&gt;');
  assert.equal(t.video.url, 'https://www.youtube.com/watch?v=_UqxoLmydas');
  assert.equal(t.video.publishedAt, '2026-10-11T12:00:00.000Z');
  assert.equal(t.video.thumbUrl, '/uploads/yt/_UqxoLmydas.jpg');
  assert.equal(t.bumpedAt, t.video.publishedAt);
  assert.match(t.body, /11\/10\/2026/);

  await fs.access(path.join(srv.uploadsDir, 'yt', '_UqxoLmydas.jpg'));
  const res = await fetch(srv.base + t.video.thumbUrl);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
});

test('es idempotente: la segunda sync no duplica', async () => {
  const source = fakeSource(VIDEOS);
  await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source });
  const again = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source });
  assert.equal(again.length, 0);
  assert.equal(srv.store.data.threads.length, 2);
});

test('sin fecha ni miniatura igual crea el hilo', async () => {
  const created = await syncQueridoDross({
    store: srv.store,
    uploadsDir: srv.uploadsDir,
    source: fakeSource([{ id: 'sinFecha___', title: 'Querido Dross: X' }], { failThumb: true }),
  });
  assert.equal(created[0].video.publishedAt, undefined);
  assert.equal(created[0].video.thumbUrl, undefined);
  assert.equal(created[0].body, '¿Qué opinas de este video?');
});

test('API: qd es el primer tablero; nadie puede crear hilos ahí pero sí responder', async () => {
  const boards = (await srv.get('/api/boards')).body;
  assert.equal(boards[0].id, 'qd');
  assert.equal(boards[0].name, 'Querido Dross');

  const post = await srv.post('/api/boards/qd/threads', { title: 't', body: 'b' });
  assert.equal(post.status, 403);
  assert.match(post.body.error, /los crea el sistema/);

  const [t] = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source: fakeSource(VIDEOS.slice(0, 1)) });
  const reply = await srv.post(`/api/threads/${t.id}/replies`, { body: 'buen video' });
  assert.equal(reply.status, 201);

  const catalog = (await srv.get('/api/boards/qd/threads')).body;
  assert.equal(catalog.threads[0].video.id, 'gU3R44hr3mY');
});

test('borrar un hilo de video lo vuelve a crear en la próxima sync (el admin lo puede recuperar)', async () => {
  const source = fakeSource(VIDEOS.slice(0, 1));
  const [t] = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source });
  await srv.del(`/api/admin/posts/${t.id}`, srv.admin);
  const again = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source });
  assert.equal(again.length, 1);
});


function heartSource(byId) {
  return {
    async hearted(id) {
      if (byId[id] instanceof Error) throw byId[id];
      return byId[id] ?? [];
    },
  };
}

test('corazones: guarda texto escapado, likes y fecha, ordenados; descarta doxxing; sin autor', async () => {
  const [t] = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source: fakeSource(VIDEOS.slice(0, 1)) });
  const n = await syncHearted({
    store: srv.store,
    source: heartSource({
      gU3R44hr3mY: [
        { text: 'Al que madruga <Dross> lo asusta', likes: 850, at: '2026-08-23T10:00:00.000Z' },
        { text: 'Video desmonetizado = joya', likes: 11000 },
        { text: 'mi número es 0991234567', likes: 99999 },
        { text: '   ', likes: 5 },
      ],
    }),
  });
  assert.equal(n, 1);

  const { body } = await srv.get(`/api/threads/${t.id}`);
  const h = body.thread.video.hearted;
  assert.deepEqual(h.map((c) => c.likes), [11000, 850]);
  assert.equal(h[1].text, 'Al que madruga &lt;Dross&gt; lo asusta');
  assert.equal(h[1].at, '2026-08-23T10:00:00.000Z');
  assert.ok(body.thread.video.heartedAt);
  assert.deepEqual(Object.keys(h[0]).sort(), ['likes', 'text']);
  // No cuenta como respuesta ni hace bump.
  assert.equal(body.thread.replyCount, 0);
  assert.equal(body.thread.bumpedAt, t.bumpedAt);
});

test('corazones: video sin corazones queda con []; un error no rompe el resto', async () => {
  const created = await syncQueridoDross({ store: srv.store, uploadsDir: srv.uploadsDir, source: fakeSource(VIDEOS) });
  await syncHearted({
    store: srv.store,
    source: heartSource({ gU3R44hr3mY: new Error('red caída'), _UqxoLmydas: [] }),
  });
  const byVideo = Object.fromEntries(srv.store.data.threads.map((t) => [t.video.id, t.video]));
  assert.deepEqual(byVideo._UqxoLmydas.hearted, []);
  assert.equal(byVideo.gU3R44hr3mY.hearted, undefined);
  assert.equal(created.length, 2);
});

test('videosToRefresh: nunca leídos, los 5 más nuevos y los de hace más de una semana', () => {
  const now = Date.parse('2026-10-14T00:00:00Z');
  const mk = (id, day, heartedAt) => ({
    id,
    createdAt: '2026-10-14T00:00:00Z',
    video: { id: `v${id}`, publishedAt: `2026-${String(day).padStart(2, '0')}-01T00:00:00Z`, heartedAt },
  });
  const fresh = '2026-10-13T00:00:00Z';
  const old = '2026-09-01T00:00:00Z';
  const threads = [
    mk(1, 1, fresh), mk(2, 2, fresh), mk(3, 3, old), mk(4, 4, undefined),
    mk(5, 5, fresh), mk(6, 6, fresh), mk(7, 7, fresh), mk(8, 8, fresh), mk(9, 9, fresh),
    { id: 10, board: 'conf' },
  ];
  assert.deepEqual(videosToRefresh(threads, now).map((t) => t.id), [3, 4, 5, 6, 7, 8, 9]);
});
