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
import { t } from './idioma';

/** Dirección del servidor. Vacía en la web (misma casa); completa en el APK. */
export const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** ¿Estamos dentro de la cáscara de Android? */
export const enLaApp = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

/**
 * La dirección pública de la app, la que se puede mandar a alguien.
 *
 * Dentro del APK `location.origin` es `https://localhost`, que es la dirección
 * interna del teléfono: un enlace de invitación con eso no le sirve a nadie, y
 * un correo de confirmación que apunte ahí no lleva a ninguna parte. Por eso
 * se usa la dirección del servidor cuando la hay.
 */
export const dominioPublico = () =>
  BASE || (typeof window !== 'undefined' ? location.origin : '');

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

/**
 * Traduce un fallo de red a algo que se pueda leer.
 *
 * Cuando el navegador corta una llamada (sin conexión, o el servidor no acepta
 * llamadas desde la app) el error que llega es un seco «Failed to fetch», en
 * inglés y sin decir nada. Sin esto el usuario solo ve una pantalla que no hace
 * nada, que es justo lo que no queremos.
 */
export function motivoDeFallo(e: any): string {
  const m = String(e?.message ?? e ?? '');
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(m)) {
    return BASE ? t('com.sinRedServidor', { url: BASE }) : t('com.sinRed');
  }
  return m || t('com.algoFallo');
}
