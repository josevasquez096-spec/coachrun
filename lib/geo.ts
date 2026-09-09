export type Point = { lat: number; lng: number; t: number; alt?: number; acc?: number };

export function toGpx(points: Point[], name: string) {
  const trk = points.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}">${p.alt != null ? `<ele>${p.alt}</ele>` : ''}<time>${new Date(p.t).toISOString()}</time></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="MyCoachRuns" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${trk}</trkseg></trk></gpx>`;
}

/** Distancia haversine en metros. */
export function haversine(a: Point, b: Point) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Suma la distancia de una traza completa. Solo como respaldo: el número bueno
 *  es el que va calculando el filtro mientras se corre. */
export function distanciaTotal(points: Point[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

/** Por encima de esta precisión (en metros) el punto no se usa para medir. */
export const ACC_MAX = 30;

/** Velocidad imposible corriendo: 12 m/s son 43 km/h. */
const V_MAX = 12;

/**
 * Filtro de distancia.
 *
 * El GPS de un teléfono tiembla varios metros aunque estés parado. Si se suma la
 * distancia entre cada par de puntos seguidos, ese temblor se SUMA en lugar de
 * cancelarse, y la app marca de más: caminando 150 m reales salían 210.
 *
 * Aquí se hacen dos cosas:
 *  1. Suavizar. Cada punto nuevo se mezcla con el anterior; cuanto peor es la
 *     precisión que reporta el teléfono, menos peso tiene el punto nuevo.
 *  2. Medir contra un ancla, no contra el punto anterior. Solo se suman metros
 *     cuando te has alejado del último punto confirmado más de lo que mide el
 *     ruido; entonces ese punto pasa a ser el ancla nueva. Así los temblores
 *     alrededor de un mismo sitio no suman nada, y el avance de verdad se cuenta
 *     una sola vez y por su valor real.
 *
 * Los números (peso y umbral) salen de simular carreras con ruido de GPS: paseos,
 * trote en recto, pista de 400 m, bucles de parque, series y señal mala. Con
 * estos, el error se queda por debajo del 3 % en todos esos casos y estar parado
 * tres minutos suma unos 8 m en vez de 1 km. Si se tocan, hay que volver a
 * simular: bajar el umbral devuelve el problema de marcar de más, y subirlo
 * empieza a cortar las curvas cerradas.
 */
export type Filtro = { suave: Point | null; ancla: Point | null; ultimo: Point | null };

export const filtroNuevo = (): Filtro => ({ suave: null, ancla: null, ultimo: null });

export function medir(f: Filtro, p: Point): { avance: number; punto: Point | null } {
  const acc = p.acc ?? 0;
  if (acc > ACC_MAX) return { avance: 0, punto: null };          // señal demasiado pobre

  if (f.ultimo) {
    const dt = Math.max(0.5, (p.t - f.ultimo.t) / 1000);
    if (haversine(f.ultimo, p) / dt > V_MAX) return { avance: 0, punto: null };   // salto del GPS
  }
  f.ultimo = p;

  const peso = 1 / (1 + Math.max(acc, 3) / 5);
  f.suave = !f.suave ? { ...p } : {
    lat: f.suave.lat + (p.lat - f.suave.lat) * peso,
    lng: f.suave.lng + (p.lng - f.suave.lng) * peso,
    t: p.t, alt: p.alt, acc,
  };
  const punto = { ...f.suave };

  if (!f.ancla) { f.ancla = { ...f.suave }; return { avance: 0, punto }; }

  const d = haversine(f.ancla, f.suave);
  const umbral = Math.min(15, Math.max(8, acc * 1.5));
  if (d < umbral) return { avance: 0, punto };                   // seguimos dentro del ruido
  f.ancla = { ...f.suave };
  return { avance: d, punto };
}

/** Metros del último tramo que quedó a medias al parar o al pausar. */
export function cerrar(f: Filtro) {
  if (!f.ancla || !f.suave) return 0;
  const d = haversine(f.ancla, f.suave);
  f.ancla = { ...f.suave };
  return d;
}
