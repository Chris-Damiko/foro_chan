import express from 'express';
import { BOARDS, BOARD_IDS } from '../boards.js';
import { anonId } from '../anon.js';
import { cleanText, httpError } from '../text.js';
import { CASES_BOARD, cleanSources, parseStatus } from '../cases.js';
import { requireAdmin } from '../admin.js';

const PAGE_SIZE = 20;
const SUMMARY_LENGTH = 300;
export const LIMITS = { title: 100, body: 4000 };

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(404, 'No encontrado');
  return id;
}

function findBoard(id) {
  if (!BOARD_IDS.has(id)) throw httpError(404, 'No encontrado');
  return id;
}

function summarize(thread) {
  if (thread.body.length <= SUMMARY_LENGTH) return thread;
  let body = thread.body.slice(0, SUMMARY_LENGTH);
  // El body ya viene escapado: no cortar una entidad a la mitad (ej. "&am").
  const amp = body.lastIndexOf('&');
  if (amp > body.lastIndexOf(';')) body = body.slice(0, amp);
  return { ...thread, body };
}

export function threadsRouter({ store, salt, limiter, adminToken }) {
  const router = express.Router();
  const findThread = (id) => {
    const thread = store.data.threads.find((t) => t.id === id);
    if (!thread) throw httpError(404, 'No encontrado');
    return thread;
  };

  router.get('/boards', (req, res) => {
    const counts = {};
    for (const t of store.data.threads) counts[t.board] = (counts[t.board] || 0) + 1;
    res.json(BOARDS.map((b) => ({ ...b, threadCount: counts[b.id] || 0 })));
  });

  router.get('/boards/:board/threads', (req, res) => {
    const board = findBoard(req.params.board);
    let page = Number.parseInt(req.query.page, 10);
    if (!Number.isSafeInteger(page) || page < 1) page = 1;

    const threads = store.data.threads
      .filter((t) => t.board === board)
      .sort((a, b) => b.bumpedAt.localeCompare(a.bumpedAt) || b.id - a.id);
    const totalPages = Math.max(1, Math.ceil(threads.length / PAGE_SIZE));
    const slice = threads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    res.json({ threads: slice.map(summarize), page, totalPages });
  });

  router.post('/boards/:board/threads', async (req, res) => {
    const board = findBoard(req.params.board);
    const undo = limiter.take('thread', req.ip);
    try {
      res.status(201).json(await createThread(board, req));
    } catch (err) {
      undo();
      throw err;
    }
  });

  async function createThread(board, req) {
    const input = req.body ?? {};
    const title = cleanText(input.title, { field: 'title', max: LIMITS.title });
    const body = cleanText(input.body, { field: 'body', max: LIMITS.body });
    const isCase = board === CASES_BOARD;
    const sources = cleanSources(input.sources, { required: isCase });

    return store.update((db) => {
      const id = store.nextId();
      const now = new Date().toISOString();
      const t = {
        id,
        board,
        title,
        anonId: anonId(req.ip, id, salt),
        body,
        createdAt: now,
        bumpedAt: now,
        replyCount: 0,
      };
      if (sources.length) t.sources = sources;
      if (isCase) {
        t.status = 'abierto';
        t.statusHistory = [{ status: 'abierto', at: now }];
      }
      db.threads.push(t);
      return t;
    });
  }

  router.patch('/threads/:id/status', requireAdmin(adminToken), async (req, res) => {
    const threadId = parseId(req.params.id);
    const status = parseStatus(req.body?.status);
    const thread = await store.update((db) => {
      const t = db.threads.find((x) => x.id === threadId);
      if (!t) throw httpError(404, 'No encontrado');
      if (t.board !== CASES_BOARD) throw httpError(400, 'Solo los hilos de Casos tienen estado');
      if (t.status === status) throw httpError(400, `El caso ya está en ${status}`);
      t.status = status;
      t.statusHistory.push({ status, at: new Date().toISOString() });
      return t;
    });
    res.json(thread);
  });

  router.get('/threads/:id', (req, res) => {
    const thread = findThread(parseId(req.params.id));
    const replies = store.data.posts.filter((p) => p.threadId === thread.id);
    res.json({ thread, replies });
  });

  router.post('/threads/:id/replies', async (req, res) => {
    const threadId = parseId(req.params.id);
    findThread(threadId);
    const undo = limiter.take('reply', req.ip);
    try {
      res.status(201).json(await createReply(threadId, req));
    } catch (err) {
      undo();
      throw err;
    }
  });

  async function createReply(threadId, req) {
    const input = req.body ?? {};
    const body = cleanText(input.body, { field: 'body', max: LIMITS.body });

    return store.update((db) => {
      // Buscar de nuevo dentro de la cola: el hilo pudo borrarse mientras esperábamos.
      const thread = db.threads.find((t) => t.id === threadId);
      if (!thread) throw httpError(404, 'No encontrado');
      const now = new Date().toISOString();
      const p = {
        id: store.nextId(),
        threadId,
        anonId: anonId(req.ip, threadId, salt),
        body,
        createdAt: now,
      };
      db.posts.push(p);
      thread.replyCount += 1;
      thread.bumpedAt = now;
      return p;
    });
  }

  return router;
}
