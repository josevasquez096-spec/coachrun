'use client';
/**
 * El andamio de cada pantalla: quién eres y los datos que esa pantalla necesita.
 *
 * Antes cada página se dibujaba en el servidor y pedía sus datos allí. Dentro
 * del APK no hay servidor que dibuje nada: las páginas viajan en el teléfono,
 * así que los datos hay que pedirlos desde el propio navegador. Esto vale igual
 * para la web, que pasa a ser una sola página y cambia de pestaña al instante.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseBrowser } from './supabase-browser';
import { pedir } from './api';

export type Perfil = {
  id: string; full_name: string | null; role: string; coach_id: string | null;
  strava_athlete_id: number | null; avatar_url: string | null;
  max_hr: number | null; resting_hr: number | null;
};
export type Sesion = { user: { id: string; email?: string | null }; profile: Perfil | null };

const EVENTO = 'coachrun:recargar';

/**
 * Pide a la pantalla que vuelva a traer sus datos.
 *
 * Sustituye a `router.refresh()`: eso recargaba lo que dibujaba el servidor, y
 * ya no dibuja nada. Sin esto, guardar un cambio no se vería hasta salir y
 * volver a entrar en la pestaña.
 */
export function refrescar() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO));
}

// La sesión se guarda entre pantallas: cambiar de pestaña no vuelve a pedirla.
let sesionCache: Sesion | null = null;
export const olvidarSesion = () => { sesionCache = null; };

export function usePantalla<T>(
  cargar?: (sb: SupabaseClient, s: Sesion) => Promise<T>,
  deps: any[] = [],
) {
  const r = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(sesionCache);
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const traer = useCallback(async (deNuevo = false) => {
    try {
      if (deNuevo) sesionCache = null;
      let s = sesionCache;
      if (!s) {
        const res = await pedir('/api/perfil');
        if (res.status === 401) { r.replace('/?entrar=1'); return; }
        if (!res.ok) throw new Error('No se pudo comprobar tu sesión (' + res.status + ')');
        s = await res.json();
        sesionCache = s;
      }
      setSesion(s);
      if (cargar) setDatos(await cargar(supabaseBrowser(), s!));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los datos. Revisa la conexión.');
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    traer();
    const f = () => traer(true);
    window.addEventListener(EVENTO, f);
    return () => window.removeEventListener(EVENTO, f);
  }, [traer]);

  return { sesion, perfil: sesion?.profile ?? null, datos, cargando, error, recargar: () => traer(true) };
}

/** El papel para la barra de pestañas, con un valor por defecto sensato. */
export const papel = (s: Sesion | null): 'coach' | 'athlete' =>
  s?.profile?.role === 'coach' ? 'coach' : 'athlete';
