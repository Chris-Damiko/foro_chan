// Ayudas de formulario compartidas (nuevo hilo y respuesta).
import { errorDeCampo } from './ui.js';

const MAX_IMAGEN = 4 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Devuelve un mensaje de error o null. El backend valida de nuevo por magic bytes. */
export function validarImagen(archivo) {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'Solo JPG, PNG, GIF o WEBP.';
  if (archivo.size > MAX_IMAGEN) return 'La imagen pesa más de 4 MB.';
  return null;
}

/** Valida al elegir archivo y muestra la vista previa en `img`. */
export function conectarVistaPrevia(input, img) {
  input.addEventListener('change', () => {
    const archivo = input.files[0];
    if (img.src) URL.revokeObjectURL(img.src);
    const error = archivo ? validarImagen(archivo) : null;
    errorDeCampo(input.closest('.campo'), error);
    img.hidden = !archivo || Boolean(error);
    if (archivo && !error) img.src = URL.createObjectURL(archivo);
    else img.removeAttribute('src');
  });
}

/** Bloquea el botón mientras se envía. Devuelve una función para restaurarlo. */
export function enviando(boton) {
  const texto = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Enviando…';
  return () => {
    boton.disabled = false;
    boton.textContent = texto;
  };
}
