'use client';
/**
 * El entrenamiento copiado, para pegarlo en el plan de otro alumno.
 *
 * Vive en el módulo (y con copia en `localStorage`) porque copiar y pegar pasan
 * en pantallas distintas: se copia en la ficha de un alumno y se pega en la de
 * otro. Si esto colgara de un componente, se perdería al cambiar de pantalla.
 */
import type { Phase } from './phases';

export type Copiado = {
  type: string;
  title: string;
  description: string | null;
  target_pace: string | null;
  target_distance_km: number | null;
  target_duration_min: number | null;
  phases: Phase[] | null;
  deQuien: string;    // de quién se copió, solo para enseñarlo
  fecha: string;      // fecha que tenía el original
};

const CLAVE = 'coachrun.copiado';
let copiado: Copiado | null = null;
const oyentes = new Set<() => void>();

function emitir() {
  try { copiado ? localStorage.setItem(CLAVE, JSON.stringify(copiado)) : localStorage.removeItem(CLAVE); } catch {}
  oyentes.forEach((f) => f());
}

export function leer() { return copiado; }
export function leerEnServidor(): Copiado | null { return null; }
export function suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f); }; }

export function copiar(c: Copiado) { copiado = c; emitir(); }
export function vaciar() { copiado = null; emitir(); }

if (typeof window !== 'undefined') {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) copiado = JSON.parse(crudo);
  } catch { copiado = null; }
}
