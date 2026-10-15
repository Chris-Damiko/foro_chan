// Identidad sin cuentas: "nombre#clave" guardado SOLO en este navegador.
// El servidor nunca guarda la clave; la convierte en tripcode al publicar.
// "Recordar" = localStorage (persiste); si no, sessionStorage (se borra al cerrar).

const CLAVE = 'dd_identidad';

function almacen(tipo) {
  try {
    return tipo === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

/** Devuelve "nombre#clave" (o "nombre", o "") guardado en este navegador. */
export function leerIdentidad() {
  try {
    return almacen('session')?.getItem(CLAVE) || almacen('local')?.getItem(CLAVE) || '';
  } catch {
    return '';
  }
}

export function guardarIdentidad(valor, recordar) {
  olvidarIdentidad();
  try {
    almacen(recordar ? 'local' : 'session')?.setItem(CLAVE, valor);
    return true;
  } catch {
    return false;
  }
}

export function olvidarIdentidad() {
  for (const tipo of ['local', 'session']) {
    try {
      almacen(tipo)?.removeItem(CLAVE);
    } catch {
      // nada que borrar
    }
  }
}

/** Solo la parte visible: "mobbu#secreto" → "mobbu". */
export function nombreVisible(identidad = leerIdentidad()) {
  return identidad.split('#')[0];
}

/**
 * Marca un input de nombre con la identidad guardada sin mostrar la clave:
 * el placeholder enseña solo el nombre y `nombreParaPublicar` la usa si el campo queda vacío.
 */
export function prepararCampoNombre(input) {
  const identidad = leerIdentidad();
  if (!input || !identidad) return;
  input.placeholder = `${nombreVisible(identidad) || 'Anónimo'} (tu identidad guardada)`;
}

/** Lo escrito en el campo, o la identidad guardada si está vacío. */
export function nombreParaPublicar(input) {
  return input.value.trim() || leerIdentidad();
}
