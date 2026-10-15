import { createApp, PATHS } from './src/app.js';
import { createStore } from './src/storage.js';
import { loadSalt, loadSecret } from './src/anon.js';
import { startVideoSync } from './src/youtube.js';

const PORT = Number(process.env.PORT) || 3000;

const store = await createStore({ dir: PATHS.data });
const salt = await loadSalt(PATHS.data);
const tripSecret = await loadSecret(PATHS.data, '.tripsecret', 'TRIP_SECRET');

const adminToken = process.env.ADMIN_TOKEN;
if (!adminToken) console.warn('ADMIN_TOKEN no está definido: las rutas de admin responden 401.');

createApp({ store, salt, tripSecret, adminToken }).listen(PORT, () => {
  console.log(`foro_chan escuchando en http://localhost:${PORT}`);
});

// Hilos de Querido Dross: uno por video, sincronizados con yt-dlp. SYNC_VIDEOS=0 lo apaga.
if (process.env.SYNC_VIDEOS !== '0') startVideoSync({ store, uploadsDir: PATHS.uploads });
