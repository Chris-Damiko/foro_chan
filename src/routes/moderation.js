import express from 'express';
import { cleanText, httpError } from '../text.js';
import { normalizeTripcode } from '../tripcode.js';

const MAX_REASON = 500;

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(404, 'No encontrado');
  return id;
}

/** Busca un post (OP o respuesta). Devuelve { thread, reply } o lanza 404. */
function findPost(db, id) {
  const thread = db.threads.find((t) => t.id === id);
  if (thread) return { thread, reply: null };
  const reply = db.posts.find((p) => p.id === id);
  if (!reply) throw httpError(404, 'No encontrado');
  return { thread: db.threads.find((t) => t.id === reply.threadId), reply };
}

/**
 * Reportes (públicos) y borrado (admin).
 * `onDeleteImages(images)` lo usa B7 para borrar los archivos del disco.
 */
export function moderationRouter({ store, limiter, requireAdmin, onDeleteImages = async () => {} }) {
  const router = express.Router();
  const admin = requireAdmin;

  router.post('/posts/:id/report', async (req, res) => {
    const postId = parseId(req.params.id);
    const { reply } = findPost(store.data, postId);
    if (reply?.deleted) throw httpError(404, 'No encontrado');

    const undo = limiter.take('report', req.ip);
    try {
      const reason = cleanText(req.body?.reason, { field: 'reason', max: MAX_REASON });
      await store.update((db) => {
        const found = findPost(db, postId);
        db.reports.push({
          id: store.nextReportId(),
          postId,
          threadId: found.thread.id,
          reason,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      undo();
      throw err;
    }
    res.json({ ok: true });
  });

  router.get('/admin/reports', admin, (req, res) => {
    res.json([...store.data.reports].reverse());
  });

  router.delete('/admin/posts/:id', admin, async (req, res) => {
    const postId = parseId(req.params.id);
    const images = await store.update((db) => {
      const { thread, reply } = findPost(db, postId);

      if (reply) {
        if (reply.deleted) throw httpError(404, 'No encontrado');
        const removed = reply.image ? [reply.image] : [];
        reply.deleted = true;
        reply.body = '';
        delete reply.image;
        db.reports = db.reports.filter((r) => r.postId !== postId);
        return removed;
      }

      // Es el OP: se borra el hilo entero con sus respuestas y sus reportes.
      const replies = db.posts.filter((p) => p.threadId === thread.id);
      const removed = [thread, ...replies].map((p) => p.image).filter(Boolean);
      db.threads = db.threads.filter((t) => t.id !== thread.id);
      db.posts = db.posts.filter((p) => p.threadId !== thread.id);
      db.reports = db.reports.filter((r) => r.threadId !== thread.id);
      return removed;
    });
    await onDeleteImages(images);
    res.json({ ok: true });
  });

  router.post('/admin/tripcodes/:trip/ban', admin, async (req, res) => {
    const trip = normalizeTripcode(req.params.trip);
    await store.update((db) => {
      db.bannedTripcodes ??= [];
      if (!db.bannedTripcodes.includes(trip)) db.bannedTripcodes.push(trip);
    });
    res.json({ ok: true });
  });

  router.delete('/admin/tripcodes/:trip/ban', admin, async (req, res) => {
    const trip = normalizeTripcode(req.params.trip);
    await store.update((db) => {
      db.bannedTripcodes = (db.bannedTripcodes ?? []).filter((t) => t !== trip);
    });
    res.json({ ok: true });
  });

  return router;
}
