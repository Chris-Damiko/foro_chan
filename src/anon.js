import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Secreto del servidor: viene de la variable de entorno `envVar` o se genera una vez
 * y se guarda en data/<fileName>, así no cambia al reiniciar.
 */
export async function loadSecret(dataDir, fileName, envVar) {
  if (process.env[envVar]) return process.env[envVar];
  const file = path.join(dataDir, fileName);
  try {
    return (await fs.readFile(file, 'utf8')).trim();
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const secret = crypto.randomBytes(32).toString('hex');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, secret, { mode: 0o600 });
    return secret;
  }
}

/** Sal para los anonId (ANON_SALT o data/.salt). */
export const loadSalt = (dataDir) => loadSecret(dataDir, '.salt', 'ANON_SALT');

/** 8 caracteres, igual para la misma IP dentro de un hilo y distinto entre hilos. La IP no se guarda. */
export function anonId(ip, threadId, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(`${ip}|${threadId}`)
    .digest('base64url')
    .slice(0, 8);
}
