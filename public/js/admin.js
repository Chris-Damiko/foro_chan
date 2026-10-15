// Panel de moderación (F6). Usa la cookie dd_admin (se crea en /entrar.html?modo=admin).
import {
  bloquearTripcode, borrarPost, cambiarEstado, estadoAdmin, obtenerHilo,
  obtenerReportes, obtenerTableros, salirAdmin,
} from './api.js';
import { pintarPost } from './post.js';
import { desescapar, fechaCorta } from './texto.js';
import { el, insigniaEstado, pintarBarra, sinSenal, urlHilo } from './ui.js';

const sesion = document.getElementById('sesion');
const panel = document.getElementById('panel');
const lista = document.getElementById('reportes');

obtenerTableros().then((res) => res.ok && pintarBarra(res.data));
iniciar();

async function iniciar() {
  if (!(await estadoAdmin())) {
    sesion.replaceChildren('No has entrado como admin. ',
      el('a', { href: '/entrar.html?modo=admin' }, 'Entrar'));
    return;
  }
  const salir = el('button', { class: 'btn btn--texto', type: 'button' }, 'Cerrar sesión');
  salir.addEventListener('click', async () => {
    await salirAdmin();
    location.assign('/entrar.html?modo=admin');
  });
  sesion.replaceChildren('Sesión de admin activa. ', salir);
  panel.hidden = false;
  conectarFormularios();
  cargarReportes();
}

async function cargarReportes() {
  lista.replaceChildren(el('div', { class: 'esqueleto', style: 'height: 8rem' }));
  const res = await obtenerReportes();
  if (!res.ok) {
    lista.replaceChildren(sinSenal(res.error));
    return;
  }
  const reportes = res.data;
  document.getElementById('titulo-reportes').textContent = `Reportes (${reportes.length})`;
  if (!reportes.length) {
    lista.replaceChildren(sinSenal('No hay reportes pendientes.'));
    return;
  }

  // Un pedido por hilo, aunque tenga varios reportes.
  const hilos = new Map();
  for (const id of new Set(reportes.map((r) => r.threadId))) hilos.set(id, obtenerHilo(id));

  const tarjetas = await Promise.all(reportes.map(async (r) => tarjetaReporte(r, await hilos.get(r.threadId))));
  lista.replaceChildren(...tarjetas);
}

function tarjetaReporte(reporte, resHilo) {
  const cabecera = el('p', { class: 'meta' },
    `Reporte #${reporte.id} · ${fechaCorta(reporte.createdAt)} · `,
    el('a', { href: `${urlHilo(reporte.threadId)}#p${reporte.postId}`, target: '_blank' }, `No.${reporte.postId}`),
  );
  const motivo = el('p', { class: 'admin-motivo' }, desescapar(reporte.reason));
  const tarjeta = el('article', { class: 'panel admin-reporte' }, cabecera, motivo);

  if (!resHilo.ok) {
    tarjeta.append(el('p', { class: 'meta' }, 'El hilo ya no existe.'));
    return tarjeta;
  }
  const { thread, replies } = resHilo.data;
  const post = reporte.postId === thread.id ? thread : replies.find((p) => p.id === reporte.postId);
  if (!post || post.deleted) {
    tarjeta.append(el('p', { class: 'meta' }, 'El post ya fue borrado.'));
    return tarjeta;
  }

  tarjeta.append(pintarPost(post, { esOp: post === thread, reportable: false, enlaceCita: () => null }));
  const acciones = el('div', { class: 'formulario__acciones' });
  acciones.append(botonConfirmado(
    post === thread ? 'Borrar hilo entero' : 'Borrar post',
    async () => {
      const r = await borrarPost(post.id);
      return r.ok ? null : r.error;
    },
  ));
  if (post.tripcode) {
    acciones.append(botonConfirmado(`Bloquear ${post.tripcode}`, async () => {
      const r = await bloquearTripcode(post.tripcode);
      return r.ok ? null : r.error;
    }));
  }
  if (thread.status) acciones.append(insigniaEstado(thread.status));
  tarjeta.append(acciones);
  return tarjeta;
}

/** Botón de dos pasos (sin confirm() del navegador): 1er clic pregunta, 2º ejecuta. */
function botonConfirmado(texto, accion) {
  const b = el('button', { class: 'btn', type: 'button' }, texto);
  let armado = false;
  b.addEventListener('click', async () => {
    if (!armado) {
      armado = true;
      b.textContent = '¿Seguro? Clic otra vez';
      b.classList.add('btn--primario');
      setTimeout(() => {
        if (armado) {
          armado = false;
          b.textContent = texto;
          b.classList.remove('btn--primario');
        }
      }, 4000);
      return;
    }
    armado = false;
    b.disabled = true;
    const error = await accion();
    if (error) {
      b.disabled = false;
      b.textContent = `Error: ${error}`;
      return;
    }
    cargarReportes();
  });
  return b;
}

function conectarFormularios() {
  document.getElementById('form-estado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const salida = document.getElementById('a-estado-res');
    const id = document.getElementById('a-hilo').value.trim().replace(/^No\.?/i, '');
    if (!/^\d+$/.test(id)) {
      salida.textContent = 'Escribe el número del hilo.';
      return;
    }
    const r = await cambiarEstado(id, document.getElementById('a-estado').value);
    salida.textContent = r.ok ? `Hilo No.${id} ahora está: ${r.data.status}.` : r.error;
  });

  document.getElementById('form-firma').addEventListener('submit', async (e) => {
    e.preventDefault();
    const salida = document.getElementById('a-firma-res');
    const firma = document.getElementById('a-firma').value.trim();
    const bloquear = e.submitter?.dataset.accion !== 'desbloquear';
    if (!firma) {
      salida.textContent = 'Escribe un tripcode.';
      return;
    }
    const r = await bloquearTripcode(firma, bloquear);
    salida.textContent = r.ok ? `${firma} ${bloquear ? 'bloqueada' : 'desbloqueada'}.` : r.error;
  });
}
