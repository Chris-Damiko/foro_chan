// F5: efectos con JS en todas las páginas.
// - Glitch aleatorio en los títulos (.glitch): cada uno a su ritmo, y de vez en cuando uno salta.
// - Transición VHS corta al navegar a otra página del sitio.
// - Sonido de estática opcional (apagado por defecto), generado con WebAudio, sin archivos.
// Con prefers-reduced-motion no se anima nada; el sonido solo suena si la persona lo activó.

const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CLAVE_SONIDO = 'dd_sonido';

/* ---------- Sonido ---------- */

let audio = null;

function sonidoActivo() {
  try {
    return localStorage.getItem(CLAVE_SONIDO) === '1';
  } catch {
    return false;
  }
}

/** Ráfaga corta de estática (ruido blanco filtrado), bajita. */
export function estatica(duracion = 0.12, volumen = 0.04) {
  if (!sonidoActivo()) return;
  try {
    audio ??= new AudioContext();
    const muestras = Math.floor(audio.sampleRate * duracion);
    const buffer = audio.createBuffer(1, muestras, audio.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
    const fuente = audio.createBufferSource();
    fuente.buffer = buffer;
    const filtro = audio.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 2400;
    const ganancia = audio.createGain();
    ganancia.gain.value = volumen;
    fuente.connect(filtro).connect(ganancia).connect(audio.destination);
    fuente.start();
  } catch {
    // Sin WebAudio: silencio.
  }
}

function conectarInterruptor() {
  const pie = document.querySelector('.pie');
  if (!pie) return;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'pie__sonido';
  const pintar = () => {
    const activo = sonidoActivo();
    boton.textContent = `[sonido: ${activo ? 'sí' : 'no'}]`;
    boton.setAttribute('aria-pressed', String(activo));
  };
  boton.addEventListener('click', () => {
    try {
      localStorage.setItem(CLAVE_SONIDO, sonidoActivo() ? '0' : '1');
    } catch {
      return;
    }
    pintar();
    estatica(0.18, 0.05);
  });
  pintar();
  pie.append(' ', boton);
}

/* ---------- Glitch aleatorio ---------- */

function glitchAleatorio() {
  // Cada título arranca su ciclo en un punto distinto: no saltan todos a la vez.
  for (const nodo of document.querySelectorAll('.glitch')) {
    nodo.style.setProperty('--glitch-retraso', `${(-Math.random() * 7).toFixed(2)}s`);
  }
  // Y cada 4–12 s, uno al azar hace un glitch extra.
  const programar = () => setTimeout(() => {
    const todos = [...document.querySelectorAll('.glitch')];
    const elegido = todos[Math.floor(Math.random() * todos.length)];
    if (elegido && !document.hidden) {
      elegido.classList.add('glitch--activo');
      setTimeout(() => elegido.classList.remove('glitch--activo'), 300);
    }
    programar();
  }, 4000 + Math.random() * 8000);
  programar();
}

/* ---------- Transición entre páginas ---------- */

function transiciones() {
  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[href]');
    if (!enlace || evento.defaultPrevented || evento.button !== 0) return;
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    if (enlace.target && enlace.target !== '_self') return;
    const destino = new URL(enlace.href, location.href);
    if (destino.origin !== location.origin) return;
    if (destino.pathname === location.pathname && destino.search === location.search) return; // mismo documento (#ancla)

    evento.preventDefault();
    estatica();
    document.body.classList.add('saliendo');
    setTimeout(() => location.assign(destino.href), 160);
  });
  // Al volver con "atrás", el navegador puede restaurar la página con la clase puesta.
  addEventListener('pageshow', () => document.body.classList.remove('saliendo'));
}

conectarInterruptor();
if (!sinMovimiento) {
  glitchAleatorio();
  transiciones();
}
