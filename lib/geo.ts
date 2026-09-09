export type Point = { lat: number; lng: number; t: number; alt?: number; acc?: number };

export function toGpx(points: Point[], name: string) {
  const trk = points.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}">${p.alt != null ? `<ele>${p.alt}</ele>` : ''}<time>${new Date(p.t).toISOString()}</time></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="CoachRun" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${trk}</trkseg></trk></gpx>`;
}

/** Distancia haversine en metros. */
export function haversine(a: Point, b: Point) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Suma la distancia de una traza completa (la usamos al guardar). */
export function distanciaTotal(points: Point[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

/**
 * Decide si un punto nuevo cuenta y cuánta distancia añade.
 * - Descarta saltos imposibles (más de 12 m/s sostenidos).
 * - No descarta los avances pequeños: los acumula, para no perder metros
 *   en curvas y ritmos lentos, que era lo que hacía marcar de menos.
 */
export function acumular(prev: Point | null, nuevo: Point, pendiente: number) {
  if (!prev) return { suma: 0, pendiente: 0, aceptar: true };
  const d = haversine(prev, nuevo);
  const dt = Math.max(0.001, (nuevo.t - prev.t) / 1000);
  const v = d / dt;
  if (v > 12) return { suma: 0, pendiente, aceptar: false };          // salto de GPS
  const acc = nuevo.acc ?? 0;
  if (d < Math.min(4, Math.max(2, acc / 4))) {                        // movimiento dentro del ruido
    const p = pendiente + d;
    if (p >= 5) return { suma: p, pendiente: 0, aceptar: true };      // acumulado suficiente: cuenta
    return { suma: 0, pendiente: p, aceptar: false };
  }
  return { suma: d + pendiente, pendiente: 0, aceptar: true };
}
