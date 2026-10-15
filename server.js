import { createApp, PATHS } from './src/app.js';
import { createStore } from './src/storage.js';
import { loadSalt } from './src/anon.js';

const PORT = Number(process.env.PORT) || 3000;

const store = await createStore({ dir: PATHS.data });
const salt = await loadSalt(PATHS.data);

const adminToken = process.env.ADMIN_TOKEN;
if (!adminToken) console.warn('ADMIN_TOKEN no está definido: las rutas de admin responden 401.');

createApp({ store, salt, adminToken }).listen(PORT, () => {
  console.log(`foro_chan escuchando en http://localhost:${PORT}`);
});
