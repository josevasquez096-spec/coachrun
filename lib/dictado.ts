'use client';
/**
 * Lo que la voz dice durante la carrera, armado en el idioma de la app.
 *
 * Vive aparte de `lib/phases.ts` a propósito: phases.ts lo usa también el
 * servidor (la ruta que genera el `.FIT`), y este archivo tira de
 * `lib/idioma.ts`, que es de cliente. Si se mezclaran, esa ruta se rompería.
 *
 * Reglas que hay que respetar en cualquier idioma, porque ya nos mordieron:
 *  - Un ritmo "3:30" hay que dictarlo "3 30": con los dos puntos la voz lo lee
 *    como una división.
 *  - "Serie 2/12" igual: se dice "Serie 2 de 12".
 *  - Los decimales se dicen con la palabra ("5 coma 2"), no con el punto.
 */
import { t } from './idioma';
import type { Step } from './phases';

/** Un número de minutos, con su palabra en singular o plural. */
function minutos(n: number) {
  return n === 1 ? t('voz.unMinuto') : t('voz.minutos', { n });
}

/** Un ritmo tal como se dicta: "3:30" la voz lo lee raro, "3 30" lo lee bien. */
export function dictarRitmo(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return s === 0 ? minutos(m) : `${m} ${String(s).padStart(2, '0')}`;
}

/** El objetivo de un paso, en palabras y completo (antes solo decía un extremo). */
export function dictarObjetivo(s: Step) {
  if (s.paceLow && s.paceHigh && s.paceLow !== s.paceHigh)
    return t('voz.entreRitmos', { a: dictarRitmo(s.paceLow), b: dictarRitmo(s.paceHigh) });
  const uno = s.paceLow || s.paceHigh;
  if (uno) return t('voz.unRitmo', { a: dictarRitmo(uno) });
  if (s.hrZone) return t('voz.zonaPulso', { n: s.hrZone });
  return '';
}

/** Una distancia en metros, dicha en metros o en kilómetros. */
export function dictarDistancia(m: number) {
  if (m < 1000) return t('voz.metros', { n: Math.round(m) });
  const km = m / 1000;
  const n = km % 1 === 0 ? String(km) : km.toFixed(1).replace('.', t('voz.coma'));
  return t('voz.kilometros', { n });
}

/** Un rato, en palabras: nada de "12:34", que la voz lee como una división. */
export function dictarTiempo(seg: number) {
  if (seg < 60) return t('voz.segundos', { n: seg });
  const h = Math.floor(seg / 3600);
  const min = Math.floor((seg % 3600) / 60);
  const resto = seg % 60;
  const partes: string[] = [];
  if (h) partes.push(h === 1 ? t('voz.unaHora') : t('voz.horas', { n: h }));
  if (min || h) partes.push(minutos(min));
  const texto = partes.join(' ');
  return resto ? t('voz.minutosYsegundos', { m: texto, s: resto }) : texto;
}

/** La cantidad de un paso, en palabras. */
export function dictarCantidad(s: Step) {
  if (s.mode === 'distance') return dictarDistancia(s.meters ?? 0);
  return dictarTiempo(s.seconds ?? 0);
}

/** El nombre de una fase tal como lo escribió el coach, pero legible en voz. */
export function dictarNombre(nombre: string) {
  return nombre.replace('/', t('voz.de'));
}
