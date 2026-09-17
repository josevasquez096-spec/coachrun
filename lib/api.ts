'use client';
/**
 * Todas las llamadas del navegador al servidor pasan por aquí.
 *
 * Existe porque la app corre en dos sitios muy distintos:
 *  - **En la web**: la dirección `/api/...` vale tal cual, y la sesión viaja
 *    sola en las cookies.
 *  - **Dentro del APK**: las páginas vienen de dentro del teléfono, así que
 *    `/api/...` no apunta a ninguna parte y hay que poner la dirección
 *    completa de Vercel. Y las cookies no se envían entre dominios distintos,
 *    así que la sesión hay que adjuntarla a mano en cada petición.
 *
 * Regla: **nunca llamar a `fetch('/api/...')` directamente**. Desde el APK
 * fallaría en silencio, y eso no se ve hasta tener el teléfono en la mano.
 */
import { supabaseBrowser } from './supabase-browser';

/** Dirección del servidor. Vacía en la web (misma casa); completa en el APK. */
export const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** ¿Estamos dentro de la cáscara de Android? */
export const enLaApp = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

export async function pedir(ruta: string, opciones: RequestInit = {}) {
  const cab = new Headers(opciones.headers);
  // La sesión solo hace falta adjuntarla cuando no hay cookies que valgan.
  if (BASE) {
    try {
      const { data } = await supabaseBrowser().auth.getSession();
      const t = data.session?.access_token;
      if (t) cab.set('Authorization', `Bearer ${t}`);
    } catch { /* sin sesión: el servidor responderá 401 y la pantalla lo dirá */ }
  }
  return fetch(BASE + ruta, { ...opciones, headers: cab });
}
