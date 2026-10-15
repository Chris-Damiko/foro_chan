// F10: aceptar reglas y términos antes del primer post. Se recuerda en este navegador.
import { el, errorDeCampo } from './ui.js';

const CLAVE = 'dd_terminos';

export function terminosAceptados() {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

function aceptarTerminos() {
  try {
    localStorage.setItem(CLAVE, '1');
  } catch {
    // Sin almacenamiento: se volverá a pedir la próxima vez.
  }
}

/**
 * Si aún no se aceptaron, agrega la casilla antes de `antesDe` (las acciones del formulario).
 * Devuelve una función que valida: true si se puede publicar.
 */
export function conectarTerminos(antesDe) {
  if (terminosAceptados()) return () => true;

  const casilla = el('input', { type: 'checkbox', id: `terminos-${Math.random().toString(36).slice(2, 8)}` });
  const enlace = el('a', { href: '/reglas.html', target: '_blank' }, 'reglas y términos');
  const campo = el('div', { class: 'campo campo--casilla' },
    el('label', { for: casilla.id }, casilla, ' Leí y acepto las ', enlace, '.'),
  );
  antesDe.before(campo);

  return () => {
    const ok = casilla.checked;
    errorDeCampo(campo, ok ? null : 'Tienes que aceptar las reglas para publicar.');
    if (!ok) {
      casilla.focus();
      return false;
    }
    aceptarTerminos();
    return true;
  };
}
