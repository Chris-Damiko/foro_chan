// Avatar generado a partir del tripcode (F8): el mismo tripcode da siempre el mismo dibujo.
// Sin fotos ni caras: una figura simétrica de 5×5 con una fila "desfasada" como glitch VHS.
// Se construye con nodos SVG, nunca con innerHTML.

const NS = 'http://www.w3.org/2000/svg';
const COLORES = ['#d6d2c8', '#c2493f', '#7e9a5c', '#7d7a73'];
const FONDO = '#151516';

/** Generador pseudoaleatorio determinista (FNV-1a + xorshift32). */
function semilla(texto) {
  let h = 0x811c9dc5;
  for (const c of texto) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 0x100000000;
  };
}

function nodo(tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

/**
 * @param {string} tripcode p. ej. "!h8Q3v0FAPP"
 * @param {number} [tamano] px
 * @returns {SVGSVGElement}
 */
export function avatarDeTripcode(tripcode, tamano = 32) {
  const azar = semilla(tripcode);
  const color = COLORES[Math.floor(azar() * COLORES.length)];
  const filaGlitch = Math.floor(azar() * 5);
  const desfase = azar() < 0.5 ? -1 : 1;

  const svg = nodo('svg', {
    viewBox: '0 0 7 7', width: tamano, height: tamano,
    class: 'avatar', 'shape-rendering': 'crispEdges', 'aria-hidden': 'true',
  });
  svg.append(nodo('rect', { width: 7, height: 7, fill: FONDO }));

  for (let fila = 0; fila < 5; fila++) {
    // 3 columnas al azar y espejo de las 2 primeras: figura simétrica.
    const mitad = [azar() < 0.5, azar() < 0.5, azar() < 0.5];
    const celdas = [...mitad, mitad[1], mitad[0]];
    const dx = fila === filaGlitch ? desfase * 0.5 : 0;
    celdas.forEach((llena, col) => {
      if (!llena) return;
      const x = col + 1 + dx;
      const y = fila + 1;
      if (dx) {
        svg.append(nodo('rect', { x: x - 0.25, y, width: 1, height: 1, fill: '#3fa7a3', opacity: 0.5 }));
        svg.append(nodo('rect', { x: x + 0.25, y, width: 1, height: 1, fill: '#b33a3a', opacity: 0.5 }));
      }
      svg.append(nodo('rect', { x, y, width: 1, height: 1, fill: color }));
    });
  }
  return svg;
}
