// Importa todos los videos "Querido Dross" como hilos del tablero qd.
// Uso: npm run importar:videos   (con el servidor DETENIDO: los dos escribirían data/db.json)
// Con el servidor andando no hace falta: él mismo sincroniza al arrancar y cada 6 h.
import { PATHS } from '../src/app.js';
import { createStore } from '../src/storage.js';
import { syncQueridoDross } from '../src/youtube.js';

const store = await createStore({ dir: PATHS.data });
const created = await syncQueridoDross({ store, uploadsDir: PATHS.uploads, log: console.log });
console.log(`Listo: ${created.length} hilos nuevos.`);
