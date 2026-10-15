import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/storage.js';

let dir;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'foro-chan-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const readFile = async (store) => JSON.parse(await fs.readFile(store.file, 'utf8'));

test('crea db.json vacío si no existe', async () => {
  const store = await createStore({ dir });
  const disk = await readFile(store);
  assert.equal(disk.seq, 0);
  assert.deepEqual(disk.threads, []);
  assert.deepEqual(disk.posts, []);
  assert.deepEqual(disk.reports, []);
});

test('update guarda en disco y se recupera al reabrir', async () => {
  const store = await createStore({ dir });
  const id = await store.update((db) => {
    const id = store.nextId();
    db.threads.push({ id, title: 'hola' });
    return id;
  });
  assert.equal(id, 1);

  const reopened = await createStore({ dir });
  assert.deepEqual(reopened.data.threads, [{ id: 1, title: 'hola' }]);
  assert.equal(reopened.data.seq, 1);
});

test('updates simultáneos no repiten ids', async () => {
  const store = await createStore({ dir });
  const ids = await Promise.all(
    Array.from({ length: 50 }, () =>
      store.update(async (db) => {
        const id = store.nextId();
        await new Promise((r) => setTimeout(r, Math.random() * 3));
        db.posts.push({ id });
        return id;
      }),
    ),
  );
  assert.equal(new Set(ids).size, 50);
  assert.equal((await readFile(store)).posts.length, 50);
});

test('si update falla, se descartan los cambios y la cola sigue', async () => {
  const store = await createStore({ dir });
  await assert.rejects(
    store.update((db) => {
      store.nextId();
      db.posts.push({ id: 1 });
      throw new Error('fallo');
    }),
    /fallo/,
  );
  assert.equal(store.data.seq, 0);
  assert.deepEqual(store.data.posts, []);

  const id = await store.update(() => store.nextId());
  assert.equal(id, 1);
});

test('no deja archivos temporales', async () => {
  const store = await createStore({ dir });
  await store.update((db) => db.posts.push({ id: store.nextId() }));
  assert.deepEqual(await fs.readdir(dir), ['db.json']);
});

test('db.json dañado: falla sin sobrescribirlo', async () => {
  await fs.writeFile(path.join(dir, 'db.json'), '{roto');
  await assert.rejects(createStore({ dir }), /No se pudo leer/);
  assert.equal(await fs.readFile(path.join(dir, 'db.json'), 'utf8'), '{roto');
});
