import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Sal secreta para los anonId. Viene de ANON_SALT o se genera una vez y se guarda
 * en data/.salt, así los anonId no cambian al reiniciar el servidor.
 */
export async function loadSalt(dataDir) {
  if (process.env.ANON_SALT) return process.env.ANON_SALT;
  const file = path.join(dataDir, '.salt');
  try {
    return (await fs.readFile(file, 'utf8')).trim();
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const salt = crypto.randomBytes(32).toString('hex');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, salt, { mode: 0o600 });
    return salt;
  }
}

/** 8 caracteres, igual para la misma IP dentro de un hilo y distinto entre hilos. La IP no se guarda. */
export function anonId(ip, threadId, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(`${ip}|${threadId}`)
    .digest('base64url')
    .slice(0, 8);
}
