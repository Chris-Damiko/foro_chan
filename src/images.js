import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { httpError } from './text.js';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const THUMB_SIZE = 250;
// Evita "bombas de descompresión": imágenes chicas en bytes pero gigantes en píxeles.
const MAX_PIXELS = 40_000_000;

const FORMATS = {
  'image/jpeg': { ext: 'jpg', encode: (img) => img.jpeg({ quality: 90, mozjpeg: true }) },
  'image/png': { ext: 'png', encode: (img) => img.png() },
  'image/gif': { ext: 'gif', encode: (img) => img.gif() },
  'image/webp': { ext: 'webp', encode: (img) => img.webp({ quality: 90 }) },
};

/** Tipo real según los primeros bytes (magic bytes), sin mirar la extensión ni el Content-Type. */
export function detectMime(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  const head = buf.subarray(0, 12).toString('latin1');
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Middleware multer: un archivo `image` en memoria, como máximo 4 MB. No toca peticiones JSON. */
export function uploadImage() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10, fieldSize: 64 * 1024 },
  }).single('image');

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return next(httpError(413, 'La imagen supera 4 MB'));
      if (err instanceof multer.MulterError) return next(httpError(400, 'Formulario inválido: solo se acepta un archivo en el campo image'));
      next(err);
    });
  };
}

/**
 * Valida y re-codifica la imagen. Re-codificar con sharp elimina EXIF/GPS y cualquier
 * otro metadato. Devuelve los buffers listos para guardar; todavía no escribe nada.
 */
export async function processImage(buf) {
  const mime = detectMime(buf);
  if (!mime) throw httpError(400, 'Formato de imagen no permitido (solo jpg, png, gif o webp)');
  const format = FORMATS[mime];
  const animated = mime === 'image/gif' || mime === 'image/webp';

  try {
    const { data, info } = await format
      .encode(sharp(buf, { animated, limitInputPixels: MAX_PIXELS }).rotate())
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(buf, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    // En animaciones, info.height es la suma de todos los cuadros.
    const height = info.pageHeight ?? info.height;
    return { mime, ext: format.ext, data, thumb, width: info.width, height };
  } catch {
    throw httpError(400, 'La imagen está dañada o es demasiado grande');
  }
}

/** Escribe la imagen procesada como <id>.<ext> y thumbs/<id>.webp. Devuelve el objeto Image del contrato. */
export async function saveImage(uploadsDir, id, processed) {
  await fs.mkdir(path.join(uploadsDir, 'thumbs'), { recursive: true });
  const file = `${id}.${processed.ext}`;
  await fs.writeFile(path.join(uploadsDir, file), processed.data);
  await fs.writeFile(path.join(uploadsDir, 'thumbs', `${id}.webp`), processed.thumb);
  return {
    url: `/uploads/${file}`,
    thumbUrl: `/uploads/thumbs/${id}.webp`,
    width: processed.width,
    height: processed.height,
    size: processed.data.length,
    mime: processed.mime,
  };
}

/** Borra del disco los archivos de una lista de Image. Ignora los que ya no existen. */
export async function deleteImages(uploadsDir, images) {
  for (const image of images) {
    for (const url of [image.url, image.thumbUrl]) {
      const rel = url.replace(/^\/uploads\//, '');
      // path.basename evita que una url manipulada salga de la carpeta.
      const file = path.join(uploadsDir, path.dirname(rel) === 'thumbs' ? 'thumbs' : '', path.basename(rel));
      await fs.rm(file, { force: true });
    }
  }
}
