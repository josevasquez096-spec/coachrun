'use client';
/**
 * Mensajes sin leer, compartidos por toda la app.
 *
 * Vive en el módulo (no dentro de un componente) para que al cambiar de pestaña
 * el número ya esté ahí y no parpadee: la barra vuelve a montarse en cada
 * pantalla, pero estos datos no se pierden.
 */
export type Avisos = { total: number; por: Record<string, number> };

const VACIO: Avisos = { total: 0, por: {} };
let datos: Avisos = VACIO;
let ultima = 0;
let pidiendo = false;
let reloj: any = null;
const oyentes = new Set<() => void>();

export function leer() { return datos; }
export function leerEnServidor() { return VACIO; }

export async function refrescar(forzar = false) {
  if (pidiendo) return;
  if (!forzar && Date.now() - ultima < 10000) return;
  pidiendo = true;
  try {
    const r = await fetch('/api/messages/unread', { cache: 'no-store' });
    if (r.ok) {
      const j: Avisos = await r.json();
      // Solo avisamos si algo cambió de verdad, para no redibujar sin motivo.
      if (JSON.stringify(j) !== JSON.stringify(datos)) { datos = j; oyentes.forEach((f) => f()); }
      ultima = Date.now();
    }
  } catch { /* sin conexión: dejamos el último número que teníamos */ }
  pidiendo = false;
}

export function suscribir(f: () => void) {
  oyentes.add(f);
  refrescar();
  if (!reloj) {
    reloj = setInterval(() => { if (document.visibilityState === 'visible') refrescar(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refrescar(true); });
  }
  return () => { oyentes.delete(f); };
}
