'use client';
/**
 * El idioma de la app.
 *
 * Vive **en el módulo y no en un contexto de React** a propósito: la voz que
 * habla durante la carrera se dispara desde `lib/session.ts`, que está fuera
 * de React y no puede leer un contexto. Es el mismo motivo por el que el motor
 * de grabación vive donde vive.
 *
 * De dónde sale, por orden:
 *  1. Lo que el usuario haya elegido a mano (guardado en el teléfono).
 *  2. El idioma del teléfono, si lo tenemos traducido.
 *  3. Español.
 *
 * Lo que NO se traduce: lo que escribe el coach (títulos de entrenamientos,
 * notas, mensajes del chat). Eso es contenido suyo, no de la app.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { es } from './textos/es';
import { en } from './textos/en';
import { fr } from './textos/fr';
import { pt } from './textos/pt';
import { fmtAmount, fmtPaceStr, type Phase as Fase } from './phases';

export type Idioma = 'es' | 'en' | 'fr' | 'pt';
export type Claves = keyof typeof es;

export const IDIOMAS: { id: Idioma; nombre: string }[] = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
  { id: 'fr', nombre: 'Français' },
  { id: 'pt', nombre: 'Português' },
];

/** El código que entiende la voz del teléfono para cada idioma. */
export const VOZ: Record<Idioma, string> = {
  es: 'es-ES', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR',
};

const TABLAS: Record<Idioma, Partial<Record<Claves, string>>> = { es, en, fr, pt };
const LLAVE = 'coachrun.idioma';

function delTelefono(): Idioma {
  if (typeof navigator === 'undefined') return 'es';
  for (const l of navigator.languages ?? [navigator.language]) {
    const dos = (l ?? '').slice(0, 2).toLowerCase();
    if (dos === 'es' || dos === 'en' || dos === 'fr' || dos === 'pt') return dos;
  }
  return 'es';
}

/**
 * Arranca SIEMPRE en español, también en el navegador, y se cambia al idioma
 * que toque justo después de dibujar la primera pantalla (`arrancar()`).
 *
 * Es a propósito: las pantallas vienen ya dibujadas de fábrica (en la web las
 * prepara Vercel, en el APK viajan como archivos), y ese dibujo está en
 * español. Si al arrancar el navegador pintara ya en inglés, React vería un
 * texto distinto del que trae la página y la descartaría entera. Se ve un
 * parpadeo de un instante la primera vez; a cambio no se rompe nada.
 */
let actual: Idioma = 'es';

const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

let arrancado = false;
function arrancar() {
  if (arrancado || typeof window === 'undefined') return;
  arrancado = true;
  let quiere: Idioma;
  try {
    const guardado = localStorage.getItem(LLAVE) as Idioma | null;
    quiere = guardado && guardado in TABLAS ? guardado : delTelefono();
  } catch { quiere = delTelefono(); }
  if (quiere !== actual) { actual = quiere; avisar(); }
}

export const idioma = () => actual;

export function ponerIdioma(id: Idioma) {
  if (!(id in TABLAS) || id === actual) return;
  actual = id;
  try { localStorage.setItem(LLAVE, id); } catch {}
  avisar();
}

/**
 * Una frase en el idioma de ahora.
 *
 * Si falta la traducción cae al español en vez de enseñar la clave: mejor una
 * palabra en español que un `plan.titulo` en mitad de la pantalla.
 *
 * Las piezas variables van como `{nombre}` en el texto y se pasan aquí:
 * `t('plan.hechos', { n: 3 })`.
 */
export function t(clave: Claves, piezas?: Record<string, string | number>): string {
  const texto = TABLAS[actual][clave] ?? es[clave] ?? String(clave);
  if (!piezas) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, k) => String(piezas[k] ?? `{${k}}`));
}

/** Para los componentes: se vuelven a dibujar solos al cambiar de idioma. */
export function useIdioma() {
  // El cambio al idioma de verdad va aquí, después del primer dibujado.
  useEffect(arrancar, []);
  const id = useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => actual,
    () => 'es' as Idioma,
  );
  return { idioma: id, t, ponerIdioma };
}

/** El código de país para `toLocaleDateString` y compañía. */
export const LOCALE: Record<Idioma, string> = {
  es: 'es', en: 'en', fr: 'fr', pt: 'pt-BR',
};
export const locale = () => LOCALE[actual];

/**
 * El nombre traducido de un tipo de entrenamiento ('easy', 'walk', 'rest'…).
 *
 * Vive aquí y no en `lib/format.ts` porque allí siguen las listas que usa
 * también el servidor, y el servidor no tiene idioma que consultar. Si llega
 * un tipo desconocido (uno viejo de la base de datos) se devuelve tal cual, en
 * vez de enseñar la clave.
 */
export function nombreTipo(tipo: string): string {
  const clave = `tipo.${tipo}` as Claves;
  return clave in es ? t(clave) : tipo;
}

/** Lo mismo para el deporte con el que se graba ('run', 'walk', 'trail'…). */
const CLAVE_DEPORTE: Record<string, Claves> = {
  run: 'grabar.correr', walk: 'grabar.caminata', trail: 'grabar.trail',
  strength: 'tipo.strength', rest: 'tipo.rest',
};
export function nombreDeporte(dep: string): string {
  const clave = CLAVE_DEPORTE[dep];
  return clave ? t(clave) : dep;
}

/** El nombre de una zona de pulso (1-5). Las definiciones y los rangos siguen
 *  en `lib/zones.ts`, que es cálculo puro y no sabe de idiomas. */
export function nombreZona(n: number): string {
  const clave = `zona.${n}` as Claves;
  return clave in es ? t(clave) : String(n);
}

/** El nombre del esfuerzo percibido (1-10). */
export function nombreRpe(n: number): string {
  const clave = `rpe.${n}` as Claves;
  return clave in es ? t(clave) : String(n);
}

/** El nombre de un grupo muscular ('pecho', 'isquios'…). La lista y las
 *  posiciones en el dibujo siguen en `lib/musculos.ts`. */
export function nombreMusculo(id: string): string {
  const clave = `musc.${id}` as Claves;
  return clave in es ? t(clave) : id;
}

/** Los nombres de varios músculos, en el orden en que están dibujados. */
export function nombresMusculos(ids?: string[] | null): string[] {
  return (ids ?? []).map(nombreMusculo);
}

/**
 * El resumen de una fase en una línea ("4× 800 m a 3:30–3:45 /km · recuperación
 * 2 min"), en el idioma de la app.
 *
 * Es la versión traducida de lo que antes hacía `describe()` en
 * `lib/phases.ts`. Aquella se queda allí, en español, porque el servidor la
 * usa para armar el archivo del Garmin y no sabe en qué idioma anda el atleta.
 */
export function describirFase(p: Fase): string {
  const dur = fmtAmount(p.mode, p.meters, p.seconds);
  const extremos = [fmtPaceStr(p.paceLow), fmtPaceStr(p.paceHigh)].filter(Boolean).join('–');
  const ritmo = extremos ? t('desc.ritmo', { a: extremos }) : '';
  const zona = p.hrZone ? t('desc.zona', { n: p.hrZone }) : '';
  const veces = (p.times ?? 1) > 1 ? `${p.times}× ` : '';
  const recu = p.rest
    ? t('desc.recu', { cant: fmtAmount(p.rest.mode, p.rest.meters, p.rest.seconds) })
      + (p.rest.activo === false ? t('desc.parado') : '')
    : '';
  return `${veces}${dur}${ritmo}${zona}${recu}`;
}

/** Los nombres que `expand()` le pone a una recuperación sin nombre propio. */
export const nombresPorDefecto = () => ({
  pausa: t('fase.pausa'), recuperacion: t('fase.recuperacion'),
});

/** Los cuatro tipos de fase, para el desplegable del entrenador. */
export const TIPOS_FASE = () => ({
  warmup: t('fase.calentamiento'), active: t('fase.trabajo'),
  rest: t('fase.recuperacion'), cooldown: t('fase.enfriamiento'),
});
