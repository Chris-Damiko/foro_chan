import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PATHS = {
  root: ROOT,
  public: path.join(ROOT, 'public'),
  data: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data'),
};
PATHS.uploads = path.join(PATHS.data, 'uploads');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Detrás de un proxy (Nginx, Vercel, etc.) req.ip debe venir de X-Forwarded-For.
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  app.use(express.json({ limit: '64kb' }));

  const api = express.Router();
  api.get('/health', (req, res) => {
    res.json({ ok: true });
  });
  // Rutas de B3+ se montan aquí.
  api.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
  app.use('/api', api);

  app.use('/uploads', express.static(PATHS.uploads, { fallthrough: false, index: false }));
  app.use(express.static(PATHS.public));

  // Errores: siempre JSON con { error }.
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    // No exponer rutas del disco (express.static mete el path en el mensaje del 404).
    let message = err.message;
    if (status >= 500) message = 'Error interno';
    else if (status === 404) message = 'No encontrado';
    else if (err.type === 'entity.parse.failed') message = 'JSON inválido';
    res.status(status).json({ error: message });
  });

  return app;
}
