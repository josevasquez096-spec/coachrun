'use client';
/**
 * El andamio de cada pantalla: quién eres y los datos que esa pantalla necesita.
 *
 * Antes cada página se dibujaba en el servidor y pedía sus datos allí. Dentro
 * del APK no hay servidor que dibuje nada: las páginas viajan en el teléfono,
 * así que los datos hay que pedirlos desde el propio navegador. Esto vale igual
 * para la web, que pasa a ser una sola página y cambia de pestaña al instante.
 *
 * **Sin conexión.** La app se usa corriendo, y en la calle se pierde cobertura.
 * Por eso quién eres se guarda también en el teléfono: al abrir sin internet la
 * app sabe quién entra y no se queda en blanco. Las pantallas que opten por
 * `cache` guardan además sus últimos datos, y los enseñan mientras no haya red.
 * Es lo que permite salir a correr con el entrenamiento del día aunque no haya
 * señal.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseBrowser } from './supabase-browser';
import { pedir, motivoDeFallo } from './api';

export type Perfil = {
  id: string; full_name: string | null; role: string; coach_id: string | null;
  strava_athlete_id: number | null; avatar_url: string | null;
  max_hr: number | null; resting_hr: number | null;
};
export type Sesion = { user: { id: string; email?: string | null }; profile: Perfil | null };

const EVENTO = 'coachrun:recargar';
const LLAVE = 'coachrun.sesion.perfil';

/**
 * Cuánto se espera a la red antes de tirar de lo guardado.
 *
 * Hace falta un tope porque cuando no hay cobertura la librería de Supabase
 * **no falla**: reintenta la petición una y otra vez y la promesa no se
 * resuelve nunca. La pantalla se quedaba en el esqueleto para siempre, que es
 * justo lo que se vio en el teléfono al cortar el internet. Con conexión
 * normal esto no se nota: las consultas tardan décimas de segundo.
 */
const TOPE_MS = 8000;

function conTope<T>(promesa: Promise<T>, ms = TOPE_MS): Promise<T> {
  return new Promise<T>((ok, mal) => {
    const t = setTimeout(() => mal(new Error('La red no responde.')), ms);
    promesa.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); mal(e); });
  });
}

/** Aviso que ve el usuario cuando se le enseña lo guardado en vez de lo de ahora. */
export const SIN_CONEXION = 'Sin conexión: esto es lo último que se guardó en el teléfono.';

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

// El almacén del teléfono puede fallar (modo privado, permisos): nunca debe
// tumbar la pantalla, así que todo va envuelto.
const leer = <T,>(k: string): T | null => {
  try { const t = localStorage.getItem(k); return t ? JSON.parse(t) as T : null; } catch { return null; }
};
const escribir = (k: string, v: unknown) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

// La sesión se guarda entre pantallas: cambiar de pestaña no vuelve a pedirla.
let sesionCache: Sesion | null = null;
export const olvidarSesion = () => { sesionCache = null; escribir(LLAVE, null); };

export function usePantalla<T>(
  cargar?: (sb: SupabaseClient, s: Sesion) => Promise<T>,
  deps: any[] = [],
  opciones: { cache?: string } = {},
) {
  const r = useRouter();
  const llaveDatos = opciones.cache ? 'coachrun.datos.' + opciones.cache : null;

  const [sesion, setSesion] = useState<Sesion | null>(sesionCache);
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sinConexion, setSinConexion] = useState(false);

  const traer = useCallback(async (deNuevo = false) => {
    let viejo = false;
    try {
      if (deNuevo) sesionCache = null;
      let s = sesionCache ?? leer<Sesion>(LLAVE);

      if (!s || deNuevo) {
        try {
          const res = await conTope(pedir('/api/perfil'));
          // Sesión caducada o cerrada: lo guardado ya no vale.
          if (res.status === 401) { olvidarSesion(); r.replace('/?entrar=1'); return; }
          if (!res.ok) throw new Error('No se pudo comprobar tu sesión (' + res.status + ')');
          s = await res.json() as Sesion;
          sesionCache = s;
          escribir(LLAVE, s);
        } catch (e) {
          // Sin red pero con sesión guardada: se sigue con la de antes. Sin
          // ninguna de las dos no hay nada que enseñar, y se cuenta el motivo.
          if (!s) throw e;
          viejo = true;
        }
      }
      sesionCache = s;
      setSesion(s);

      if (cargar) {
        try {
          const d = await conTope(cargar(supabaseBrowser(), s!));
          setDatos(d);
          if (llaveDatos) escribir(llaveDatos, d);
        } catch (e) {
          const g = llaveDatos ? leer<T>(llaveDatos) : null;
          if (g === null) throw e;
          setDatos(g);
          viejo = true;
        }
      }
      setSinConexion(viejo);
      setError(viejo ? SIN_CONEXION : '');
    } catch (e: any) {
      setError(motivoDeFallo(e));
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

  return { sesion, perfil: sesion?.profile ?? null, datos, cargando, error, sinConexion, recargar: () => traer(true) };
}

/**
 * Desenvuelve una consulta de Supabase **lanzando** el error si lo hay.
 *
 * Hace falta porque `sb.from(...).select()` nunca lanza: si no hay red o la
 * consulta falla, devuelve `{ data: null, error }`. Escribir `const { data } =
 * await …` se traga ese error, y la pantalla enseña una lista vacía como si de
 * verdad no hubiera nada. Sin conexión eso sale como "aún no tienes alumnos",
 * que es mentira, y además pisaba los datos guardados con una lista vacía.
 *
 * Para `maybeSingle()` no sirve: ahí TypeScript pierde el tipo de la fila. En
 * esos dos sitios el error se mira a mano, que además se lee mejor.
 */
export function pedirDatos<T>(r: { data: T | null; error: { message?: string } | null }): T | null {
  if (r.error) throw new Error(r.error.message ?? 'No se pudo consultar la base de datos.');
  return r.data;
}

/** El papel para la barra de pestañas, con un valor por defecto sensato. */
export const papel = (s: Sesion | null): 'coach' | 'athlete' =>
  s?.profile?.role === 'coach' ? 'coach' : 'athlete';
