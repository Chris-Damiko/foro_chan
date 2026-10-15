import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_NAME = 'db.json';
const SCHEMA_VERSION = 1;

function emptyDb() {
  return {
    version: SCHEMA_VERSION,
    seq: 0,        // último id de post/hilo (compartido, estilo chan: >>1234)
    reportSeq: 0,  // último id de reporte
    threads: [],   // Thread: el OP vive aquí, con id === id del post inicial
    posts: [],     // respuestas (Post)
    reports: [],   // Report
    bannedTripcodes: [], // tripcodes bloqueados por el admin ("!xxxxxxxxxx")
  };
}

/**
 * Almacenamiento en un solo archivo JSON.
 *
 * - Los datos viven en memoria; el archivo es la copia persistente.
 * - Las escrituras se serializan en una cola: nunca hay dos `update` a la vez,
 *   así los ids no se repiten aunque lleguen peticiones simultáneas.
 * - Cada escritura es atómica: se escribe a un archivo temporal y se renombra.
 *   Si el proceso muere a mitad, queda el archivo anterior completo.
 */
export async function createStore({ dir }) {
  const file = path.join(dir, FILE_NAME);
  await fs.mkdir(dir, { recursive: true });

  let db;
  try {
    db = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // No sobrescribir un archivo dañado: mejor fallar y que un humano lo revise.
      throw new Error(`No se pudo leer ${file}: ${err.message}`);
    }
    db = emptyDb();
    await writeAtomic(file, db);
  }

  let queue = Promise.resolve();

  return {
    file,

    /** Lectura directa del estado en memoria. No mutar el resultado. */
    get data() {
      return db;
    },

    /** Siguiente id global para un hilo o respuesta. Usar solo dentro de update(). */
    nextId() {
      db.seq += 1;
      return db.seq;
    },

    nextReportId() {
      db.reportSeq += 1;
      return db.reportSeq;
    },

    /**
     * Ejecuta `fn(db)` en exclusiva y guarda el resultado en disco.
     * Si `fn` lanza un error, los cambios en memoria se descartan.
     * Devuelve lo que devuelva `fn`.
     */
    update(fn) {
      const run = queue.then(async () => {
        const snapshot = structuredClone(db);
        try {
          const result = await fn(db);
          await writeAtomic(file, db);
          return result;
        } catch (err) {
          db = snapshot;
          throw err;
        }
      });
      // La cola sigue aunque una escritura falle.
      queue = run.catch(() => {});
      return run;
    },
  };
}

async function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}
