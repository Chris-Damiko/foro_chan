import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { VIDEO_BOARD } from './boards.js';
import { escapeHtml } from './text.js';
import { findPersonalData } from './doxxing.js';

const run = promisify(execFile);

export const CHANNEL_URL = 'https://www.youtube.com/@DrossRotzank/videos';
const QUERIDO_DROSS = /querido\s+dross/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export const SYSTEM_ANON_ID = 'DearDros';

/**
 * Lectura de YouTube con yt-dlp (sin API key). Separada en funciones para que
 * los tests puedan reemplazarla sin red.
 */
export function ytdlpSource({ bin = process.env.YTDLP_PATH || 'yt-dlp', channelUrl = CHANNEL_URL } = {}) {
  return {
    /** [{ id, title }] del más nuevo al más viejo. `limit` = solo los últimos N. */
    async list({ limit } = {}) {
      const args = ['--flat-playlist', '--print', '%(id)s\t%(title)s'];
      if (limit) args.push('--playlist-end', String(limit));
      const { stdout } = await run(bin, [...args, channelUrl], { maxBuffer: 32 * 1024 * 1024, timeout: 10 * 60_000 });
      return stdout
        .split('\n')
        .map((line) => {
          const tab = line.indexOf('\t');
          return { id: line.slice(0, tab), title: line.slice(tab + 1).trim() };
        })
        .filter((v) => VIDEO_ID.test(v.id) && v.title);
    },

    /** Fecha de publicación en ISO, o undefined si no se pudo leer. */
    async publishedAt(id) {
      try {
        const { stdout } = await run(bin, ['--skip-download', '--print', '%(upload_date)s', `https://www.youtube.com/watch?v=${id}`], { timeout: 60_000 });
        const m = /^(\d{4})(\d{2})(\d{2})/.exec(stdout.trim());
        return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toISOString() : undefined;
      } catch {
        return undefined;
      }
    },

    /**
     * Comentarios principales con corazón del creador: [{ text, likes, at? }].
     * Se descarta todo lo que identifica a quien comentó (nombre, foto, canal).
     */
    async hearted(id) {
      const { stdout } = await run(
        bin,
        [
          '--skip-download', '--write-comments', '--dump-single-json',
          '--extractor-args', 'youtube:max_comments=all,all,0,0;comment_sort=top',
          `https://www.youtube.com/watch?v=${id}`,
        ],
        { maxBuffer: 512 * 1024 * 1024, timeout: 15 * 60_000 },
      );
      return (JSON.parse(stdout).comments ?? [])
        .filter((c) => c.is_favorited && c.parent === 'root')
        .map((c) => ({
          text: String(c.text ?? ''),
          likes: Number(c.like_count) || 0,
          ...(c.timestamp && { at: new Date(c.timestamp * 1000).toISOString() }),
        }));
    },

    /** Bytes de la miniatura publicada por YouTube. */
    async thumbnail(id) {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
      if (!res.ok) throw new Error(`miniatura ${id}: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}

/** Re-codifica la miniatura (sin metadatos) y la guarda en uploads/yt/<id>.jpg. */
async function saveThumb(uploadsDir, id, bytes) {
  const dir = path.join(uploadsDir, 'yt');
  await fs.mkdir(dir, { recursive: true });
  const jpg = await sharp(bytes).resize(480, 360, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
  await fs.writeFile(path.join(dir, `${id}.jpg`), jpg);
  return `/uploads/yt/${id}.jpg`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/**
 * Crea un hilo en el tablero qd por cada video "Querido Dross" que todavía no tenga hilo.
 * Idempotente: identifica cada video por su id de YouTube.
 * Devuelve la lista de hilos creados.
 */
export async function syncQueridoDross({ store, uploadsDir, source = ytdlpSource(), limit, log = () => {} }) {
  const known = new Set(store.data.threads.filter((t) => t.video).map((t) => t.video.id));
  const videos = (await source.list({ limit }))
    .filter((v) => QUERIDO_DROSS.test(v.title) && !known.has(v.id))
    .reverse(); // del más viejo al más nuevo: los ids del foro quedan en orden cronológico

  const created = [];
  for (const v of videos) {
    const publishedAt = await source.publishedAt(v.id);
    let thumbUrl;
    try {
      thumbUrl = await saveThumb(uploadsDir, v.id, await source.thumbnail(v.id));
    } catch (err) {
      log(`Sin miniatura para ${v.id}: ${err.message}`);
    }

    const thread = await store.update((db) => {
      if (db.threads.some((t) => t.video?.id === v.id)) return null; // otra sync llegó primero
      const now = new Date().toISOString();
      const t = {
        id: store.nextId(),
        board: VIDEO_BOARD,
        title: escapeHtml(v.title.slice(0, 100)),
        anonId: SYSTEM_ANON_ID,
        system: true,
        body: escapeHtml(
          publishedAt ? `Video publicado el ${formatDate(publishedAt)}. ¿Qué opinas?` : '¿Qué opinas de este video?',
        ),
        createdAt: now,
        bumpedAt: publishedAt ?? now,
        replyCount: 0,
        video: {
          id: v.id,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          ...(publishedAt && { publishedAt }),
          ...(thumbUrl && { thumbUrl }),
        },
      };
      db.threads.push(t);
      return t;
    });
    if (thread) {
      created.push(thread);
      log(`Hilo ${thread.id}: ${v.title}`);
    }
  }
  return created;
}

const MAX_HEARTED_TEXT = 2000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_VIDEOS = 5;

/** Hilos de video cuyos corazones hay que (re)leer, del más nuevo al más viejo: nunca leídos, los 5 más nuevos, o leídos hace más de una semana. */
export function videosToRefresh(threads, now = Date.now()) {
  // Del más nuevo al más viejo: son los que más se visitan, así se ven antes.
  const videos = threads
    .filter((t) => t.video)
    .sort((a, b) => (b.video.publishedAt ?? b.createdAt).localeCompare(a.video.publishedAt ?? a.createdAt));
  const recent = new Set(videos.slice(0, RECENT_VIDEOS).map((t) => t.id));
  return videos.filter(
    (t) => !t.video.heartedAt || recent.has(t.id) || now - Date.parse(t.video.heartedAt) > WEEK_MS,
  );
}

/**
 * Lee los comentarios con corazón de Dross y los guarda en thread.video.hearted.
 * Sin nombre de autor; texto escapado; los que parecen tener teléfono o email se descartan.
 */
export async function syncHearted({ store, source = ytdlpSource(), threadIds, log = () => {} }) {
  const targets = threadIds
    ? store.data.threads.filter((t) => t.video && threadIds.includes(t.id))
    : videosToRefresh(store.data.threads);
  let updated = 0;

  for (const t of targets) {
    let comments;
    try {
      comments = await source.hearted(t.video.id);
    } catch (err) {
      log(`Sin comentarios para ${t.video.id}: ${err.message}`);
      continue;
    }
    const hearted = comments
      .map((c) => ({ ...c, text: c.text.trim().slice(0, MAX_HEARTED_TEXT) }))
      .filter((c) => c.text && !findPersonalData(c.text))
      .map((c) => ({ ...c, text: escapeHtml(c.text) }))
      .sort((a, b) => b.likes - a.likes);

    await store.update((db) => {
      const thread = db.threads.find((x) => x.id === t.id);
      if (!thread) return; // el admin lo borró mientras leíamos
      thread.video.hearted = hearted;
      thread.video.heartedAt = new Date().toISOString();
    });
    updated += 1;
    log(`Hilo ${t.id}: ${hearted.length} comentarios con corazón`);
  }
  return updated;
}

/**
 * Sincroniza al arrancar (todo el canal) y después cada `everyMs` (solo los últimos 30 videos).
 * Si yt-dlp no está instalado, avisa una vez y no hace nada más.
 */
export function startVideoSync({ store, uploadsDir, everyMs = 6 * 60 * 60 * 1000, source = ytdlpSource() }) {
  const log = (msg) => console.log(`[querido-dross] ${msg}`);
  let running = false;

  async function tick(limit) {
    if (running) return;
    running = true;
    try {
      const created = await syncQueridoDross({ store, uploadsDir, source, limit, log });
      if (created.length) log(`${created.length} hilos nuevos`);
      await syncHearted({ store, source, log });
    } catch (err) {
      log(err.code === 'ENOENT' ? 'yt-dlp no está instalado: no se sincronizan videos.' : `Error: ${err.message}`);
      if (err.code === 'ENOENT') clearInterval(timer);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(() => tick(30), everyMs);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
