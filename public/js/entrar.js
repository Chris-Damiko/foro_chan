// Pantalla del sombrero (F9), dos modos:
// - identidad: guarda "nombre#clave" en este navegador (nunca en el servidor).
// - admin: POST /api/admin/login → cookie HttpOnly dd_admin.
import { estatica } from './efectos.js';
import { entrarAdmin, estadoAdmin, obtenerTableros, salirAdmin } from './api.js';
import { guardarIdentidad, leerIdentidad, nombreVisible, olvidarIdentidad } from './identidad.js';
import { el, pintarBarra } from './ui.js';

const form = document.getElementById('form-entrar');
const usuario = document.getElementById('e-usuario');
const clave = document.getElementById('e-clave');
const recordar = document.getElementById('e-recordar');
const ayuda = document.getElementById('ayuda-entrar');
const error = document.getElementById('e-error');
const estado = document.getElementById('estado');
const icono = document.querySelector('.incognito');

/** Pone una clase de animación un momento y la quita (se puede repetir). */
function pulso(nodo, clase, ms) {
  nodo.classList.remove(clase);
  void nodo.offsetWidth; // reinicia la animación si ya estaba
  nodo.classList.add(clase);
  setTimeout(() => nodo.classList.remove(clase), ms);
}

// Glitch en el lente donde se escribe.
for (const input of [usuario, clave]) {
  input.addEventListener('input', () => pulso(input.closest('.gafas__lente'), 'gafas__lente--glitch', 180));
}

const AYUDA = {
  identidad: 'Elige un nombre y una clave. Se guardan solo en este navegador. La clave firma tus posts con un tripcode y el servidor nunca la guarda.',
  admin: 'Solo moderación. Escribe la contraseña de admin.',
};

let modo = new URLSearchParams(location.search).get('modo') === 'admin' ? 'admin' : 'identidad';

obtenerTableros().then((res) => res.ok && pintarBarra(res.data));
document.querySelectorAll('.cara__modo').forEach((tab) =>
  tab.addEventListener('click', () => cambiarModo(tab.dataset.modo)));
cambiarModo(modo);

function cambiarModo(nuevo) {
  modo = nuevo;
  document.querySelectorAll('.cara__modo').forEach((tab) =>
    tab.setAttribute('aria-selected', String(tab.dataset.modo === modo)));
  const esAdmin = modo === 'admin';
  usuario.disabled = esAdmin;
  usuario.value = esAdmin ? 'admin' : '';
  clave.value = '';
  document.getElementById('recordar-fila').hidden = esAdmin;
  ayuda.textContent = AYUDA[modo];
  error.hidden = true;
  (esAdmin ? clave : usuario).focus();
  pintarEstado();
}

async function pintarEstado() {
  if (modo === 'identidad') {
    const actual = leerIdentidad();
    if (!actual) {
      estado.hidden = true;
      return;
    }
    const conFirma = actual.includes('#');
    estado.replaceChildren(
      'Publicas como ',
      el('strong', {}, nombreVisible(actual) || 'Anónimo'),
      conFirma ? ' (con firma). ' : ' (sin firma). ',
      boton('Olvidar identidad', () => {
        olvidarIdentidad();
        pintarEstado();
      }),
    );
    estado.hidden = false;
    return;
  }

  const activo = await estadoAdmin();
  if (modo !== 'admin') return; // cambió de pestaña mientras esperaba
  estado.hidden = !activo;
  if (activo) {
    estado.replaceChildren('Sesión de admin activa. ', el('a', { href: '/admin.html' }, 'Ir al panel'), ' · ', boton('Cerrar sesión', async () => {
      await salirAdmin();
      pintarEstado();
    }));
  }
}

function boton(texto, alClic) {
  const b = el('button', { class: 'btn btn--texto', type: 'button' }, texto);
  b.addEventListener('click', alClic);
  return b;
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;

  if (modo === 'identidad') {
    const nombre = usuario.value.trim();
    const secreto = clave.value;
    if (!nombre && !secreto) return mostrarError('Escribe un nombre, una clave o los dos.');
    if (nombre.includes('#')) return mostrarError('El nombre no puede llevar #.');
    if (secreto && secreto.length < 8) return mostrarError('Usa una clave de al menos 8 caracteres: si es corta, otro podría adivinarla y firmar como tú.');
    const valor = secreto ? `${nombre}#${secreto}` : nombre;
    if (!guardarIdentidad(valor, recordar.checked)) return mostrarError('Este navegador no deja guardar datos (¿modo privado?).');
    clave.value = '';
    celebrar();
    pintarEstado();
    return;
  }

  if (!clave.value) return mostrarError('Escribe la contraseña de admin.');
  // La gabardina es el botón: solo cambia el texto, no el dibujo.
  const boton = form.querySelector('.gabardina');
  const texto = boton.querySelector('.gabardina__texto');
  boton.disabled = true;
  texto.textContent = '…';
  const res = await entrarAdmin(clave.value);
  boton.disabled = false;
  texto.textContent = 'ENTRAR';
  clave.value = '';
  if (!res.ok) return mostrarError(res.status === 401 ? 'Contraseña incorrecta.' : res.error);
  celebrar();
  pintarEstado();
});

function mostrarError(mensaje) {
  error.textContent = mensaje;
  error.hidden = false;
  pulso(icono, 'incognito--error', 600);
  estatica(0.25, 0.06);
}

function celebrar() {
  pulso(icono, 'incognito--ok', 900);
}
